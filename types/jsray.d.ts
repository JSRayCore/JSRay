/**
 * JSRay · type declarations
 * CommonJS usage:   const JSRay = require('jsray');
 * Browser global:   after loading jsray.js, use window.JSRay
 */

declare namespace JSRay {
  /** A single grammar rule · internal shape, rarely constructed directly */
  interface GrammarRule {
    cls: string;
    pattern: RegExp;
    inside?: GrammarRule[];
    lookbehind?: boolean;
  }

  type Grammar = GrammarRule[];

  /** A single token, produced by `tokenize`. */
  interface Token {
    type: string;
    content: string | TokenStream;
  }

  /** A renderer-agnostic stream produced by `tokenize`. */
  type TokenStream = Array<string | Token>;

  /** Grammars for every registered language */
  const languages: Record<string, Grammar>;

  /** Normalize aliases such as `language-c++`, `c#`, `yml`, or `py`. */
  function normalizeLanguage(lang: string): string;

  /** Guess a language identifier from source text. Returns an empty string if unsure. */
  function detectLanguage(code: string): string;

  /** One color/style entry in a theme block. */
  interface ThemeTokenStyle {
    color: string;
    fontStyle?: 'bold' | 'italic' | 'bold italic';
  }

  /** A single dark/light theme block from tokens.json. */
  interface ThemeBlock {
    background: string;
    foreground: string;
    border?: string;
    gutter?: string;
    lineHighlight?: string;
    tokens: Record<string, ThemeTokenStyle>;
  }

  /**
   * Apply a theme block (matching tokens.json shape) at runtime by
   * setting `--jr-*` CSS variables on the given root element
   * (defaults to `document.documentElement`).
   */
  function applyTheme(theme: ThemeBlock, root?: HTMLElement): void;

  /**
   * Tokenize a code string into a renderer-agnostic stream.
   * Unknown `lang` returns `[code]` so non-HTML renderers can
   * still emit plain text.
   */
  function tokenize(code: string, lang: string): TokenStream;

  /**
   * Render a token stream (from `tokenize`) into the default
   * HTML form: `<span class="tk-xxx">…</span>`.
   */
  function render(stream: TokenStream | string): string;

  /**
   * Render a code string into HTML with `<span class="tk-xxx">` wrappers.
   * Unknown `lang` falls back to HTML-escaped source.
   * Equivalent to `render(tokenize(code, lang))`.
   */
  function highlight(code: string, lang: string): string;

  /**
   * Highlight a single `<code>` element.
   * The language is parsed from `language-xxx`/`lang-xxx` or detected from text.
   */
  function highlightElement(el: Element): void;

  /**
   * Scan a root node (defaults to `document`) and highlight every
   * language-marked code block and plain `<pre><code>` block inside it.
   */
  function highlightAll(root?: ParentNode): void;
}

export = JSRay;
export as namespace JSRay;
