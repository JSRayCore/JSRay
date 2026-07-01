# 支持的语言

[English](languages.md) · **简体中文**

每种语言的 `class` 标识、所识别 token、范例片段。

---

## JavaScript / TypeScript

**class**: `language-js` `language-javascript` `language-ts` `language-typescript` `language-jsx` `language-tsx`

识别：
- 关键字 (含 TS 专属 `interface`, `type`, `satisfies`, `infer` 等)
- `function foo()` / `class Bar` 声明名 → `tk-fn-decl`
- 形参列表 → `tk-var-param`（含 `function name(a, b: T = 0)` 和 `(a, b) => ...`）
- 内置变量：`console`, `window`, `document`, `globalThis`, `Math`, `JSON`, ...
- 内置函数（出现在 `.fn(` 或 `fn(` 位置）：`log`, `fetch`, `parseInt`, ...
- 模板字符串 `` `...${id}...` ``，含 `${}` 内联高亮
- 正则字面量 `/pattern/flags`，上下文敏感（前面是 `=` `(` `,` `return` 等才识别）
- `ALL_CAPS` 常量、`.property` 访问、`@decorator`

```ts
async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}
```

---

## Python

**class**: `language-python` `language-py`

识别：
- 关键字（含 3.10+ `match`/`case`）
- `def foo` / `class Bar` 声明名
- 形参列表（含类型注解和默认值）
- `self`, `cls`, `__name__`, `__init__`, `__file__` → `tk-var-builtin`
- 80+ 内置函数 (`print`, `len`, `range`, `isinstance`, ...)
- 三引号字符串、f-string / r-string / b-string 前缀
- `@decorator`

```python
@dataclass
class Article:
    title: str
    views: int = 0

    def popular(self) -> bool:
        return self.views > 1_000
```

---

## PHP

**class**: `language-php`

识别 PHP 起始标签、变量（`$name`）、声明名、类/接口名、关键字、常见内置函数、属性访问（`->name`, `::name`）、字符串、注释和数字。

```php
<?php
function render_code($code) {
  echo htmlspecialchars($code);
}
```

---

## Go

**class**: `language-go` `language-golang`

识别 `package`、`import`、`func`、声明、内置调用、字符串、注释、数字，以及 `fmt.Println` 这类选择器调用。

```go
package main

func main() {
  fmt.Println("JSRay")
}
```

---

## Swift / Kotlin / Dart / Lua

**class**: `language-swift` `language-kotlin` `language-kt` `language-kts` `language-dart` `language-lua`

识别常见关键字、函数声明、类型/类声明、内置调用、字符串、注释、数字、标点和成员访问。Lua 使用独立规则支持 `--` 注释和 `function ... end` 结构。

```swift
import Foundation

func greet(name: String) {
  print(name)
}
```

```kotlin
fun main() {
  println("JSRay")
}
```

```dart
void main() {
  print("JSRay");
}
```

```lua
function greet(name)
  print(name)
end
```

---

## Java / C / C++ / C# / Rust / Ruby

**class**: `language-java` `language-c` `language-cpp` `language-csharp` `language-cs` `language-rust` `language-rs` `language-ruby` `language-rb`

识别常见关键字、类/类型声明、函数声明、函数调用、属性/成员访问、字符串、注释、数字和常量。C-family 语法支持预处理行和注解；Rust 额外识别 `println!` 这类宏调用。

```rust
fn main() {
    let mut count = 1;
    println!("count = {}", count);
}
```

---

## HTML

**class**: `language-html` `language-htm` `language-xml` `language-svg` `language-vue`

识别：
- `<tagname>` `</tagname>` 标签名
- 属性名、属性值（带引号）
- HTML 注释 `<!-- -->`
- `<!DOCTYPE>` 声明
- 实体引用 `&amp;` `&#x20;`

```html
<article class="card" data-id="42">
  <h2>标题</h2>
</article>
```

---

## CSS

**class**: `language-css` `language-scss` `language-sass` `language-less`

识别：
- 选择器（含伪类 `:hover`、属性选择器 `[type="text"]`）
- `@media`, `@keyframes`, `@import` 等 at-rule
- 属性名、值、单位（`px`, `rem`, `%`, `s`, `deg`, ...）
- 颜色字面量 `#fff` / `#abcdef`
- `!important`

```css
.card:hover {
  transform: translateY(-2px);
  transition: transform 200ms ease;
}
```

---

## JSON

**class**: `language-json` `language-jsonc`

识别：
- **key**（双引号字符串后跟 `:`）→ `tk-type` 青色
- value 字符串 → `tk-string` 珊瑚色
- `true` `false` `null` → 关键字粉/紫
- 数字（含科学计数法、负数）

```json
{
  "name": "jsray",
  "version": "0.0.1-internal.1",
  "active": true,
  "count": 22
}
```

---

## Shell

**class**: `language-bash` `language-shell` `language-sh` `language-zsh`

识别：
- 关键字：`if`, `for`, `function`, `export`, ...
- 70+ 常用命令作为内置函数：`grep`, `git`, `npm`, `docker`, `kubectl`, ...
- 变量：`$VAR`, `${VAR}`, `$@`, `$?`
- 字符串（双引号支持 `$` 内插）
- 命令行选项 `-x`, `--foo`

```bash
if [ ! -d "$DIST" ]; then
  mkdir -p "$DIST" && cp src/* "$DIST/"
fi
```

---

## Markdown

**class**: `language-md` `language-markdown`

识别：
- `# 标题` 多级
- `**粗体**`, `*斜体*`
- `[链接文本](url)`
- `` `内联代码` ``, ```` ```围栏代码``` ````
- `- item`, `* item`, `1. item` 列表
- `> 引用`
- `---` 分隔线

```md
# JSRay

一款 **零依赖** 的代码渲染内核，支持 *多种语言*。

- 自动扫描
- 双主题

[查看演示](https://jsray.org)
```

---

## SQL

**class**: `language-sql`

识别 SQL 注释、字符串、数字、运算符、标点、常见关键字（`SELECT`, `FROM`, `WHERE`, `JOIN`, `CREATE TABLE` 等）和聚合函数（`count`, `sum`, `avg` 等）。

```sql
SELECT count(*) FROM posts WHERE status = 'publish';
```

---

## YAML

**class**: `language-yaml` `language-yml`

识别 key、注释、字符串、布尔/null、数字、文档标记、anchor、alias、列表和标点。

```yaml
name: jsray
enabled: true
plugins:
  - wordpress
```

---

## 自动识别

JSRay 暴露 `JSRay.detectLanguage(code)`。当代码片段有明确特征时返回语言 id，不确定时返回空字符串。需要精确控制时，仍优先建议显式写 `language-*` class。
