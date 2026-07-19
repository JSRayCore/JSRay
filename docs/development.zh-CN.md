# JSRay 开发指南

[English](development.md) · [简体中文](development.zh-CN.md)

JSRay 生态的工程参考:全部官方仓库的架构、契约、约定与工作流。

> 一个渲染核心,让代码在不同平台中发光。

---

## 1. 生态地图

四个平级仓库,各自独立定版、独立发布:

| 仓库 | 角色 | 交付物 | 关键入口 |
|---|---|---|---|
| `jsray` | **Core** —— 渲染内核 | `dist/jsray.js` + `dist/jsray.css` + `dist/themes/*.css` | `src/jsray.js`(约 1.4k 行)、`tokens.json`、`themes/*.json` |
| `jsray-wp` | WordPress 插件 | 可安装 zip(slug 为 `jsray`) | `jsray.php`、`assets/js/jsray-loader.js`、`assets/js/jsray-block.js` |
| `jsray-vscode` | VS Code 扩展 | 8 款配色主题 + Markdown 预览 | `package.json` 贡献点、`tools/build-themes.mjs`、`media/preview-adapter.js` |
| `jsray-terminal` | 终端 CLI | `jsray` 命令 | `bin/jsray.mjs`、`lib/ansi.mjs` |

每个集成捆绑 Core 的**快照**(而非运行时依赖),并可通过生态渲染器契约(§5)替换其它渲染引擎。项目拆分与发布边界见 [projects.md](projects.md)。

---

## 2. Core 架构

全部逻辑在一个零依赖文件 `src/jsray.js` 中,组织为一条管线:

```
代码字符串 ──tokenize(code, rules)──▶ token 流 ──渲染器──▶ 输出
                    ▲                      │
             G[lang] 语法             字符串与 {type, content}
             (有序正则规则)            节点,可递归嵌套
```

1. **分词器** —— `tokenize()` 按顺序应用语法规则(先匹配者胜)。规则支持 `inside`(对捕获文本递归套用子语法——参数列表、模板字符串插值)与 `lookbehind`(捕获组 1 作为前缀被消费但不着色,且后续规则仍可匹配它)。
2. **Token 流** —— 渲染器无关的契约:由普通字符串和 `{ type: 'tk-*', content: 字符串或子流 }` 节点组成的数组。所有平台消费同一形状:`render()` 输出 HTML span,`jsray-terminal` 输出 ANSI 序列。
3. **语法注册表 `G`** —— 每个语言族一个规则数组;别名是普通引用(`G.ts = G.javascript`)。C 家族(C、C++、Java、C#、Go、Rust、Swift、Kotlin、Dart、Scala、Objective-C)共用 `cLikeGrammar(keywords, builtins, options)` 工厂(选项:`rustMacros`、`fnDeclKeywords`)。
4. **语言检测** —— `detectLanguage()` 三步走:JSON 解析快速通道 → shebang 快速通道(`#!` 解释器映射)→ 各语言特征打分并过置信阈值。diff 检测器排在首位,防止补丁内容被识别成其内嵌语言。
5. **主题运行时** —— `applyTheme(themeBlock, root)` 写入 `--jr-*` CSS 变量。默认目标是携带 `data-theme` 的元素(通常是 `<body>`):主题样式表通过 `[data-theme]` 选择器把同名变量定义在那里,写到祖先节点的内联变量会被遮蔽。
6. **公开 API** —— `highlight`、`highlightElement`、`highlightAll`、`tokenize`、`render`、`applyTheme`、`detectLanguage`、`normalizeLanguage`、`languages`。UMD 式导出:CommonJS `module.exports` + `global.JSRay`。

**语法规则顺序至关重要。** 字符串必须先于注释匹配(字符串里的 `#` 或 `//` 不能触发注释),声明规则先于关键字规则(否则 `function`/`def` 会吃掉声明名)。完整清单见 CONTRIBUTING.md。

---

## 3. Token 与调色板契约

语义词汇表共 **23 个 token 键**,以六族分离哲学分组:参数、系统内建、常量、声明、调用、中性变量永远在视觉上可区分。

每款主题以一份调色板 JSON 为唯一真源,扇出到所有平台:

```
tokens.json (default) ─┐
themes/aurora.json     ├─▶ tools/generate-theme.mjs ─▶ src/themes/<id>.css  (web)
themes/ember.json      ├─▶ jsray-vscode build-themes ─▶ VS Code 主题 JSON   (编辑器)
themes/fjord.json      ┴─▶ jsray-terminal lib/ansi   ─▶ SGR 转义序列        (运行时)
```

同一语义键在三层各有一个名字——必须保持锁步:

| 层 | 名称 | 定义位置 |
|---|---|---|
| 调色板 JSON | `variable.parameter` | `tokens.json`、`themes/*.json` |
| CSS 变量 | `--jr-var-param` | 生成的 `src/themes/*.css` |
| 运行时类名 | `tk-var-param` | 语法规则的 `cls:` 值,由 `src/jsray.css` 定样式 |

需要保持同步的映射表(各仓库的测试各自守护一段):

- `tools/generate-theme.mjs` 的 `ALIAS`(Core)
- `src/jsray.js` 内的 `THEME_ALIAS`(Core 运行时)
- `jsray-vscode/tools/build-themes.mjs` 的 `TEXTMATE_MAP` / `SEMANTIC_MAP`
- `jsray-terminal/lib/ansi.mjs` 的 `TOKEN_KEY`

每款调色板必须**同时**提供 `dark` 与 `light` 两块,23 个 token 全部为 6 位 hex;否则 Core 的 `tests/palettes.test.mjs` 会失败。`fontStyle` 字段(`bold`/`italic`)由 VS Code 与终端渲染器消费;web 层在 `src/jsray.css` 中硬编码等效字体规则。

### 回退链

每个渲染器解析 token 键时按点号逐级截断,直到在调色板中命中:

```
function.declaration → function → (中性前景色)
string.escape (未来) → string → (中性前景色)
```

四个消费端(`applyThemeToRoot`、`generate-theme.mjs`、VS Code `build-themes.mjs`、终端 `ansi.mjs`)均已实现。这正是词汇表能**在小版本中增长而不破坏任何东西**的机制:新的精化键在调色板与平台跟进之前,处处按其基类家族渲染。

### 词汇表治理

23 键词汇表刻意封闭。新增一个键必须同时满足:

1. 该语义在 **≥ 3 门受支持语言**中出现——绝不添加单语言专属 token,映射到最近的现有键。
2. 存在基类家族无法表达的真实视觉区分需求(牢记色相预算:色相属于六个标识符族,新键只用明暗/字重做精化,不新增色相)。
3. 有明确定义的回退基类(`new.key` 截断后必须命中现有键)。
4. 完整清单:语法 `cls:` 使用、`src/jsray.css` 的 `.tk-*` 规则、四张别名映射表(§3)的条目、调色板更新可选(回退链兜底)、一条一致性测试、文档表行。

新键随小版本发布(纯增量);重命名或删除键属于大版本事件。

---

## 4. 语言

35 个语言族、79 个语言键(含别名)。新增一门语言:

1. 在 `src/jsray.js` 写语法(独立 `G.<lang>` 数组,或 C 系语法用 `cLikeGrammar` 工厂)。
2. 别名:`G.<alias> = G.<lang>` **加** `LANGUAGE_ALIASES` 条目。
3. 在 `DETECTORS` 加检测器(选独有特征;权重克制,避免波及既有语言),必要时加 `SHEBANGS`。
4. 在 `tests/highlight.test.mjs` 加测试 + 一条 `detectLanguage` 断言。
5. 文档:`docs/languages.md` 与 `docs/languages.zh-CN.md` 增补小节、README 表格(中英)。
6. 下游:WP 语言下拉(`jsray.php` 的 `jsray_wp_supported_languages`)、终端 `EXT_LANG` 扩展名映射。

---

## 5. 集成

所有集成遵守**渲染器契约**,宿主可将 JSRay 换成其它引擎:

```js
renderer.highlight(code, language) -> html
renderer.highlightElement(element) -> void
renderer.detectLanguage(code)      -> 语言 id 或 ''
renderer.languages                 -> { [language]: grammar }
```

### jsray-wp(WordPress)

- `jsray.php` 注册资源、**JSRay Code** Gutenberg 区块、设置页(主题模式/回退语言/资源开关)与 `[jsray]` 短代码;6 个 `jsray_wp_*` filter 开放平台层。
- `assets/js/jsray-loader.js` 前端运行:解析每个区块的语言(class → data 属性 → 自动检测 → 回退)、规整标记、应用主题、绑定复制按钮、监听 DOM 变化重扫。适配器可经 `window.JSRayWP.renderer` 替换引擎。
- 打包:`npm run build` → `build/jsray-wp-<version>.zip`(以 `check:versions` 为闸门)。

### jsray-vscode(VS Code)

- **主题**:`tools/build-themes.mjs` 把 23 个键做双层映射——TextMate scope(尽力而为,处处可用)与 semantic token 选择器(精确层,声明加粗/参数斜体在此落地)。工作台颜色只接受 hex,`rgba()` 行高亮自动转 `#RRGGBBAA`。
- **Markdown 预览**:静态贡献点加载 `media/jsray.js`(Core 本体)与 `media/preview-adapter.js`;适配器重渲染围栏代码块、按源码文本缓存、跟随编辑器明暗 UI。无 activation 代码。
- Marketplace 发布要求纯 semver(发布时去掉 `-internal.N` 后缀)。

### jsray-terminal(CLI)

- `bin/jsray.mjs`:单文件或 stdin;语言按 `--lang` → 扩展名映射 → 特殊文件名(`Dockerfile`、`Makefile`)→ `detectLanguage()` 解析。识别不了降级为纯文本。交互式 TTY 下裸敲 `jsray` 显示帮助(绝不阻塞)。
- `lib/ansi.mjs`:默认真彩,xterm-256 降采样(6×6×6 色立方 + 灰阶),管道输出转纯文本。每个 SGR 序列以 reset 开头,嵌套 token 结束后父样式自动续色。Core 以 `vendor/jsray.cjs` 捆绑(`.cjs` 因为包是 ESM)。
- **jsray 是 `cat`/`less` 的替代命令,不是终端全局钩子** —— 面向用户的帮助里要显著说明。

---

## 6. 跨仓库约定

**版本管理** —— 每个仓库携带 `version.json`(`version`、`channel: internal|beta|stable`、`publicBetaReleased`、`bundledCore`)。频道不变量(由各仓库的 `tools/check-versions.mjs` 强制):

- `internal` → 版本以 `-internal.N` 结尾,`package.json` 保持 `private: true`,WordPress `Stable tag: trunk`。
- `beta` → `-beta.N`;`stable` → 纯 semver。

**Core 快照同步** —— 集成不在运行时依赖 Core,而是捆绑快照。各集成有 `tools/sync-core.sh`(拷贝 Core `dist/` 与调色板、更新 `bundledCore.version`、重新生成派生资产)与**机会性漂移校验**:Core 以 sibling 存在时(`../jsray` 或 `JSRAY_CORE_DIR`),`check:versions` 逐字节比对捆绑内容;Core 不在场(CI 单独克隆)则静默跳过。日常漂移是**提示性的**(警告,exit 0)——只有严格模式(`JSRAY_STRICT_DRIFT=1` 或 `--strict`)才硬失败,打包门禁和 `sync-integrations` 使用严格模式。集成对 Core 更新是**批量吸收**,如同 Electron 应用批量吸收 Chromium:插件发版时捡起当时最新的 Core,从不逐版追赶。

**发布列车** —— 插件每次发版钉死一个确切的 Core 版本(`version.json` 的 `bundledCore`);用户通过各平台的自动更新通道获得插件更新。

1. *Core 小版本/补丁*走**选择性列车**:安全修复、新语言/新主题、渲染修复必发插件补丁版(`npm run sync:integrations` → bump → 推送);纯内部变更可跳过,班车之间允许快照滞后。
2. *Core 大版本*走**同步列车**:全部集成随之发布对应大版本。token 类体系、公开 API、渲染器契约的破坏性变更**只允许**发生在 Core 大版本——小版本必须保持纯增量。
3. 约定:集成的大版本号 = 其内置 Core 的大版本号(插件 2.x 必然内置 Core 2.x);小版本与补丁号各仓库独立。

**零依赖** —— 任何仓库都没有运行时 npm 依赖。测试用 `node --test`;脚本是纯 sh/node。

**命名** —— 仓库名为 `jsray-<platform>`(依 WordPress 基金会商标指引,WordPress 缩写为 `jsray-wp`)。面向用户的插件名/slug 保持 `JSRay` / `jsray`。

**文档** —— 英文为源语言;主要文档保留 `*.zh-CN.md` 副本。语言切换链接的标签与 Core `check-versions` 里的中文内容断言是刻意保留的中文。

**品牌** —— 全生态一个主 logo;平台差异用文字 lockup,不做独立标识。最终标识为深色圆角底上的渐变 `</>`(`assets/brand/`,dark + light 双版本,SVG 与 PNG 均备);详见 `assets/brand/README.md`。

---

## 7. 开发循环

**Core**

```sh
cd jsray
# 编辑 src/jsray.js · src/jsray.css · tokens.json · themes/*.json
sh build.sh              # 重新生成主题 CSS + 同步 src/ → dist/
# ……并把任何用户可见的变更同步写入 CHANGELOG.md——审计已两次抓到漏记;
# changelog 是变更的一部分,不是事后补记。
npm test                 # node --test tests/*.mjs
npm run check:versions
# demo:任意静态服务器伺服仓库根目录 → /demo/index.html
```

**集成**(Core 变更后)—— 在 Core 里一条命令即可传播到全部 sibling 并跑各自的测试与校验:

```sh
npm run sync:integrations               # 构建 Core → 同步 + 测试全部集成
sh tools/sync-integrations.sh --check   # 只报告漂移状态,不做任何修改
```

快照只在集成**发版时**才必须对齐——漂移校验是开发机上的提醒,不是用户侧故障。单个仓库仍可用自己的 `npm run sync:core` 独立同步。

**新增主题** —— 在 Core 写 `themes/<id>.json`(23 token × dark+light 齐全;守住六族直觉:参数暖色斜体、内建冷色加粗、常量哑金),跑 `sh build.sh`,补 README 表格(中英)与 demo 调色板切换按钮,然后向下游 `sync:core`——VS Code 还需在 `contributes.themes` 增加对应条目。

**新增集成** —— 新建平级仓库 `jsray-<platform>`;复制这套约定:`version.json` + `check-versions` + `sync-core.sh` + 漂移校验 + `node --test` 测试 + CI;非 DOM 平台消费 token 流,DOM 平台消费 `highlightElement`;按渲染器契约留出适配器接缝。

---

## 8. 测试矩阵

| 仓库 | 套件 | 覆盖 |
|---|---|---|
| `jsray` | `highlight.test.mjs` | 全部语法、检测(含 shebang)、别名、XSS 转义、tokenize/render 等价性 |
| | `dom.test.mjs` | 伪元素上的 `highlightElement`/`highlightAll`、DOM 路径的 XSS |
| | `palettes.test.mjs` | 调色板完整性、生成 CSS 存在性、`--jr-*` ↔ `tk-*` 一致性、检测负样本 |
| `jsray-wp` | `loader.test.mjs` | `node:vm` 伪 DOM 中的 loader:语言优先级、适配器优先、主题、复制按钮 |
| `jsray-vscode` | `themes/manifest/adapter.test.mjs` | 生成器输出(含 rgba→hex8、六族分离)、manifest 完整性、预览适配器 |
| `jsray-terminal` | `ansi/cli.test.mjs` | 色彩数学、嵌套续色、经 `execFile` 的端到端 CLI |

CI:每个仓库都有 GitHub Actions(Node 18/20/22 矩阵;Core 另验 `dist/` 同步与 `npm pack`;WP 另跑 PHP 7.4/8.3 的 `php -l`;终端另有 CLI smoke)。WP 的 `jsray.php` **没有行为级测试**(PHPUnit + WP 桩刻意延后)。

---

## 9. 已知问题与路线图

- **WP**:设置页尚未开放调色板选择(aurora/ember/fjord),目前只有明暗模式;PHPUnit 覆盖延后。
- **VS Code**:真机验收(F5 / `vsce package`)未做。
- **终端**:`--bg`(整底色绘制)、分页器集成与 `--core <path>` 覆盖在路线图上。
- **用户侧 Core 锁定**(路线图):平台原生的更新控制已允许用户拒绝某班列车(WP 手动更新、VS Code 按扩展关自动更新 + 装历史版本、npm 版本锁定)。插件内的"Core 更新策略"(跟随/锁定/自定义文件)对 WP 与终端可行,对 VS Code 预览不可行(贡献点路径静态)。硬规则:锁定状态下遇到安全级 Core 更新必须显式警告——安全修复不允许被静默锁死。
- **Core**:minify 刻意缺席(零构建);公开 beta 时再议。
