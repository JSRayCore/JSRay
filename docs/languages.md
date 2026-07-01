# Supported Languages

[English](languages.md) · [简体中文](languages.zh-CN.md)

The `class` identifier, recognized tokens, and an example snippet for each language.

---

## JavaScript / TypeScript

**class**: `language-js` `language-javascript` `language-ts` `language-typescript` `language-jsx` `language-tsx`

Recognizes:
- Keywords (incl. TS-only `interface`, `type`, `satisfies`, `infer`, etc.)
- Declaration names in `function foo()` / `class Bar` → `tk-fn-decl`
- Parameter lists → `tk-var-param` (both `function name(a, b: T = 0)` and `(a, b) => ...`)
- Builtin variables: `console`, `window`, `document`, `globalThis`, `Math`, `JSON`, ...
- Builtin functions (as `.fn(` or `fn(`): `log`, `fetch`, `parseInt`, ...
- Template strings `` `...${id}...` `` with inline `${}` interpolation highlighted
- Regex literals `/pattern/flags`, context-sensitive (only after `=` `(` `,` `return`, etc.)
- `ALL_CAPS` constants, `.property` access, `@decorator`

```ts
async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}
```

---

## Python

**class**: `language-python` `language-py`

Recognizes:
- Keywords (incl. 3.10+ `match`/`case`)
- Declaration names: `def foo` / `class Bar`
- Parameter lists (incl. type annotations and defaults)
- `self`, `cls`, `__name__`, `__init__`, `__file__` → `tk-var-builtin`
- 80+ builtin functions (`print`, `len`, `range`, `isinstance`, ...)
- Triple-quoted strings, plus f-string / r-string / b-string prefixes
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

Recognizes PHP open tags, variables (`$name`), declaration names, class/interface names, keywords, common builtin functions, property access (`->name`, `::name`), strings, comments, and numbers.

```php
<?php
function render_code($code) {
  echo htmlspecialchars($code);
}
```

---

## Go

**class**: `language-go` `language-golang`

Recognizes `package`, `import`, `func`, declarations, builtin calls, strings, comments, numbers, and selector calls such as `fmt.Println`.

```go
package main

func main() {
  fmt.Println("JSRay")
}
```

---

## Swift / Kotlin / Dart / Lua

**class**: `language-swift` `language-kotlin` `language-kt` `language-kts` `language-dart` `language-lua`

Recognizes common keywords, function declarations, type/class declarations, builtin calls, strings, comments, numbers, punctuation, and member access. Lua uses its own rule set for `--` comments and `function ... end` blocks.

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

Recognizes common keywords, class/type declarations, function declarations, function calls, property/member access, strings, comments, numbers, and constants. C-family grammars include preprocessor lines and annotations; Rust also recognizes macro calls such as `println!`.

```rust
fn main() {
    let mut count = 1;
    println!("count = {}", count);
}
```

---

## HTML

**class**: `language-html` `language-htm` `language-xml` `language-svg` `language-vue`

Recognizes:
- `<tagname>` `</tagname>` tag names
- Attribute names and quoted attribute values
- HTML comments `<!-- -->`
- `<!DOCTYPE>` declaration
- Entity references `&amp;` `&#x20;`

```html
<article class="card" data-id="42">
  <h2>Title</h2>
</article>
```

---

## CSS

**class**: `language-css` `language-scss` `language-sass` `language-less`

Recognizes:
- Selectors (incl. pseudo-classes `:hover`, attribute selectors `[type="text"]`)
- At-rules: `@media`, `@keyframes`, `@import`, ...
- Property names, values, units (`px`, `rem`, `%`, `s`, `deg`, ...)
- Color literals `#fff` / `#abcdef`
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

Recognizes:
- **key** (double-quoted string followed by `:`) → `tk-type` cyan
- value strings → `tk-string` coral
- `true` `false` `null` → keyword pink/purple
- Numbers (incl. scientific notation and negatives)

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

Recognizes:
- Keywords: `if`, `for`, `function`, `export`, ...
- 70+ common commands as builtin functions: `grep`, `git`, `npm`, `docker`, `kubectl`, ...
- Variables: `$VAR`, `${VAR}`, `$@`, `$?`
- Strings (double-quoted strings support `$` interpolation)
- Command-line options `-x`, `--foo`

```bash
if [ ! -d "$DIST" ]; then
  mkdir -p "$DIST" && cp src/* "$DIST/"
fi
```

---

## Markdown

**class**: `language-md` `language-markdown`

Recognizes:
- `# Headings` (multi-level)
- `**bold**`, `*italic*`
- `[link text](url)`
- `` `inline code` ``, ```` ```fenced code``` ````
- `- item`, `* item`, `1. item` lists
- `> blockquote`
- `---` horizontal rule

```md
# JSRay

A **zero-dependency** code rendering kernel supporting *multiple languages*.

- Auto-scans code blocks
- Dual themes

[View the demo](https://jsray.org)
```

---

## SQL

**class**: `language-sql`

Recognizes SQL comments, strings, numbers, operators, punctuation, common keywords (`SELECT`, `FROM`, `WHERE`, `JOIN`, `CREATE TABLE`, ...), and aggregate functions (`count`, `sum`, `avg`, ...).

```sql
SELECT count(*) FROM posts WHERE status = 'publish';
```

---

## YAML

**class**: `language-yaml` `language-yml`

Recognizes keys, comments, strings, booleans/nulls, numbers, document markers, anchors, aliases, lists, and punctuation.

```yaml
name: jsray
enabled: true
plugins:
  - wordpress
```

---

## Automatic Detection

JSRay exposes `JSRay.detectLanguage(code)`. It returns a language id when a snippet has strong signals, and returns an empty string when it is unsure. Explicit `language-*` classes should still be preferred for exact control.
