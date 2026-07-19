# Token Semantics

[English](tokens.md) · [简体中文](tokens.zh-CN.md)

JSRay splits code tokens into 23 classes grouped into 6 semantic families.
Each class maps to one CSS class name (`tk-*`) and a pair of CSS variables (`--jr-*` × dark/light).

---

## Identifier family · 6 classes

When reading code, what an engineer cares about most is *"what is this name?"*. JSRay splits identifiers into 6 classes.

### `tk-var` · plain variable
`let result`, `const items`, `name`

Neutral foreground color. Unobtrusive, so other highlight colors stand out.

### `tk-var-param` · function parameter
`n` in `function f(n)`, `a, b` in `(a, b) => ...`

**Warm amber + italic.** Visually reads as input "flowing into" the function, distinguishing it from locals inside the body.

### `tk-var-builtin` · system / runtime variable
`this`, `self`, `cls`, `console`, `window`, `document`, `process`, `__name__`

**Cool blue + bold.** Emphasizes "you didn't define this — the runtime gave it to you."

### `tk-var-const` · constant
ALL_CAPS identifiers (`MAX_ITEMS`, `PI`)

**Muted gold.** Reads as "frozen — do not mutate."

### `tk-property` · property / field
`obj.name`, HTML `<div class="...">` 's `class`, CSS `padding`, JSON value keys

**Warm rose.** Reads as "belongs to a parent object."

### `tk-type` · type
`User`, `Promise<T>`, `str`, `List`, JSON keys

**Sharp cyan.** Represents "pattern / shape," visually distinct from the runtime blue of `var-builtin`.

---

## Function family · 3 classes

### `tk-fn-decl` · function declaration
`function foo`, `class Bar`, `def baz`

**Bright mint + bold.** "I define this here" — brighter than function calls because it's the origin of the name.

### `tk-function` · function call
Any `name(`-shaped invocation

**Mid mint.** Softer than declarations, since calls are everywhere.

### `tk-fn-builtin` · builtin function
`fetch`, `parseInt`, `Math.max`, `console.log`, `print`, `len`, `range`

**Lavender.** "From the standard library" — distinct from your own functions.

---

## Literal family · 5 classes

| Class | Purpose | Visual |
|---|---|---|
| `tk-string` | `"..."`, `'...'`, `` `...` `` | Warm coral |
| `tk-regex` | `/pattern/flags` | Warm gold |
| `tk-number` | int, float, hex, binary | Muted green-orange |
| `tk-comment` | `// ...`, `# ...`, `/* */` | Cool gray italic |
| `tk-doc` | `/** ... */`, Python docstrings | Cool gray italic (same as comment by default, separately overridable) |

---

## Structural family · 6 classes

| Class | Purpose |
|---|---|
| `tk-keyword` | `function`, `if`, `return`, `async`, `class`, `import`, ... |
| `tk-decorator` | `@dataclass`, `@media`, `@-webkit-...` |
| `tk-operator` | `=`, `=>`, `===`, `+`, `&&`, ... |
| `tk-punct` | `{} [] () ; , .` — intentionally desaturated to stay quiet |
| `tk-tag` | HTML tag names like `<article>` |
| `tk-attr` | HTML attribute names, CSS pseudo-classes |

---

## Domain-specific family · 2 sub-groups

CSS-specific:

| Class | Purpose |
|---|---|
| `tk-css-prop` | `padding`, `color`, `display` |
| `tk-css-unit` | `px`, `rem`, `%`, `s`, `deg` |
| `tk-selector` | `.card`, `#id`, `nav > a` |

Markdown-specific:

| Class | Purpose |
|---|---|
| `tk-md-heading` | `# Heading` |
| `tk-md-bold` | `**bold**` |
| `tk-md-italic` | `*italic*` |
| `tk-md-link` | `[text](url)` |
| `tk-md-code` | `` `code` `` / ```` ``` ```` |
| `tk-md-list` | `- item` |

---

## CSS variables quick reference

Every token color is driven by a CSS variable, so they're easy to override:

```css
:root {
  --jr-keyword:     #D08BFC;
  --jr-fn-decl:     #5DD8B0;
  --jr-var-param:   #F2B870;
  /* ... */
}
```

Full list: top of [src/jsray.css](../src/jsray.css).

---

## Want to customize?

1. Copy the two `:root` / `[data-theme="light"]` blocks at the top of `src/jsray.css`
2. Change any `--jr-*` variable
3. Load your override stylesheet — no need to fork the JS engine
