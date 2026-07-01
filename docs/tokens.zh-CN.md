# Token 语义详解

[English](tokens.md) · **简体中文**

JSRay 把代码中的 token 拆成 22 类，分为 5 个语义族。
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

## CSS 变量速查

所有 token 颜色都通过 CSS 变量驱动，便于覆盖：

```css
:root {
  --jr-keyword:     #D08BFC;
  --jr-fn-decl:     #5DD8B0;
  --jr-var-param:   #F2B870;
  /* ... */
}
```

完整列表见 [src/jsray.css](../src/jsray.css) 顶部。

---

## 想自定义？

1. 复制 `src/jsray.css` 顶部的两块 `:root` / `[data-theme="light"]`
2. 改其中任意 `--jr-*` 变量
3. 用你的覆盖样式表覆盖即可，无需 fork JS 引擎
