# Token 语义详解

[English](tokens.md) · **简体中文**

JSRay 把代码中的 token 拆成 23 类，分为 6 个语义族。
每个类对应一个 CSS 类名（`tk-*`）和一对 CSS 变量（`--jr-*` × dark/light）。

---

## 标识符族 · 6 类

工程师阅读代码时最关心的就是"这个名字是什么"。JSRay 把它拆成 6 类。

### `tk-var` · 普通变量
`let result`, `const items`, `name`

中性前景色。不抢眼，让其他高亮色突出。

### `tk-var-param` · 函数参数
`function f(n)` 里的 `n`, `(a, b) => ...` 里的 `a, b`

**暖琥珀色 + 斜体**。视觉上像"流入"函数的输入，与函数体内的局部变量分开。

### `tk-var-builtin` · 系统/运行时变量
`this`, `self`, `cls`, `console`, `window`, `document`, `process`, `__name__`

**冷蓝色 + 粗体**。强调"不是你定义的，是运行时给你的"。

### `tk-var-const` · 常量
ALL_CAPS 标识符 (`MAX_ITEMS`, `PI`)

**哑金色**。表示"已凝固，不要改"。

### `tk-property` · 属性 / 字段
`obj.name`、HTML `<div class="...">` 的 `class`、CSS 的 `padding`、JSON value 的 key

**暖玫色**。表示"归属于某个父对象"。

### `tk-type` · 类型
`User`, `Promise<T>`, `str`, `List`, JSON key

**锐青色**。代表"模式/形状"，与 `var-builtin` 的运行时蓝拉开。

---

## 函数族 · 3 类

### `tk-fn-decl` · 函数声明
`function foo`, `class Bar`, `def baz`

**亮薄荷色 + 粗体**。"我在这里定义"——比函数调用更亮，是这个名字的起源处。

### `tk-function` · 函数调用
任何 `name(` 形式的调用

**中薄荷色**。比声明柔和，因为调用遍布全文。

### `tk-fn-builtin` · 内置函数
`fetch`, `parseInt`, `Math.max`, `console.log`, `print`, `len`, `range`

**薰衣草色**。"来自标准库"——和你自己的函数区分。

---

## 字面族 · 5 类

| 类 | 用途 | 视觉 |
|---|---|---|
| `tk-string` | `"...", '...', \`...\`` | 暖珊瑚 |
| `tk-regex` | `/pattern/flags` | 暖金 |
| `tk-number` | 整数、浮点、十六进制、二进制 | 哑绿橙 |
| `tk-comment` | `// ...`, `# ...`, `/* */` | 冷灰 italic |
| `tk-doc` | `/** ... */`, Python docstring | 冷灰 italic (与 comment 同色,可独立调) |

---

## 结构族 · 6 类

| 类 | 用途 |
|---|---|
| `tk-keyword` | `function`, `if`, `return`, `async`, `class`, `import`, ... |
| `tk-decorator` | `@dataclass`, `@media`, `@-webkit-...` |
| `tk-operator` | `=`, `=>`, `===`, `+`, `&&`, ... |
| `tk-punct` | `{} [] () ; , .` —— 刻意降饱和不抢戏 |
| `tk-tag` | HTML 标签名 `<article>` |
| `tk-attr` | HTML 属性名、CSS 伪类 |

---

## 专属族 · 2 类

CSS 单独区分：

| 类 | 用途 |
|---|---|
| `tk-css-prop` | `padding`, `color`, `display` |
| `tk-css-unit` | `px`, `rem`, `%`, `s`, `deg` |
| `tk-selector` | `.card`, `#id`, `nav > a` |

Markdown 单独区分：

| 类 | 用途 |
|---|---|
| `tk-md-heading` | `# 标题` |
| `tk-md-bold` | `**粗体**` |
| `tk-md-italic` | `*斜体*` |
| `tk-md-link` | `[文本](url)` |
| `tk-md-code` | `` `code` `` / ```` ``` ```` |
| `tk-md-list` | `- item` |

---

## 结构性 class

并非每个语法产出的 class 都携带颜色。

| Class | 用途 |
|---|---|
| `tk-scope` | 包裹参数列表，让其中的名字能被当作参数着色。**有意不着色** —— 它的存在是给嵌套规则一个附着点，给包装层上色反而会把周围的标点一起染上。 |

自己遍历 token 流的渲染器应当让 `tk-scope` 透传，给它的子节点上色，而不是给它本身上色。

---

## CSS 变量速查

所有 token 颜色都通过 CSS 变量驱动，便于覆盖：

```css
[data-theme="dark"] {
  --jr-keyword:     #D08BFC;
  --jr-fn-decl:     #5DD8B0;
  --jr-var-param:   #F2B870;
  /* ... */
}
```

`jsray.css` 只**消费**这些变量 —— 它把 `.tk-keyword` 绑定到
`var(--jr-keyword)`，仅此而已。变量的值在主题样式表里，一个调色板一个文件：
[src/themes/default.css](../src/themes/default.css)。正是这个拆分，让你换一个
`<link>` 就能换整套配色。

---

## 想自定义？

1. 复制 `dist/themes/default.css` —— 里面同时有 `[data-theme="dark"]` 和
   `[data-theme="light"]` 两块，每块 23 个 token 变量 + 5 个表面变量
2. 改其中任意 `--jr-*` 的值
3. 用你的副本替换原主题，`jsray.css` 保持不动 —— 无需 fork JS 引擎

如果想反过来"生成"主题而不是手改 CSS：按 [tokens.json](../tokens.json) 的结构
写一份调色板 JSON，运行 `node tools/generate-theme.mjs` 即可。这也正是
`JSRay.applyTheme()` 接受的结构，同一份文件可以直接用于运行时切换。
