# MarkdownEditor

## 0. Why this exists

A WYSIWYG rich-text editor for product descriptions. The old `contentEditable` approach broke paste because DOM caret positions ≠ raw string offsets when markdown markers (`**bold**`) are rendered as HTML — fundamentally unfixable. `react-simple-code-editor` showed raw `**` markers while typing — unacceptable. Tiptap (ProseMirror-based) gives true WYSIWYG: bold looks bold, no markers ever visible.

## 1. How does it look like?

### 1.1 UI + file pathnames

- Editor — [app/components/ui/Inputs/MarkdownEditor.tsx](MarkdownEditor.tsx)
- Toolbar (B / I / U buttons) — [app/components/ui/Modals/AdminPanel/components/RichTextToolbar.tsx](../Modals/AdminPanel/components/RichTextToolbar.tsx)
- Conversion utils — [app/utils/markdownTiptap.ts](../../../utils/markdownTiptap.ts)

### 1.2 Types

```ts
interface MarkdownEditorProps {
  value: string           // markdown string: **bold**, *italic*, _underline_, * bullet
  onChange: (value: string) => void
  onBlur?: () => void
  onWrapRef?: React.MutableRefObject<((marker: string) => void) | null>
  placeholder?: string
  disabled?: boolean
  className?: string      // unused — kept for API compat
}
```

### 1.3 Data flow

```
DB (markdown string)
  │
  ▼
markdownToTiptap()        converts ** / * / _ / "* bullet" → ProseMirror JSON doc
  │
  ▼
Tiptap useEditor          ProseMirror document model (bold/italic/underline as marks)
  │
  ▼ onUpdate
tiptapToMarkdown()        ProseMirror JSON → markdown string
  │
  ▼
parent onChange(string)   React Hook Form / useState
  │
  ▼
DB (markdown string)
```

## 2. Terminology

- **ProseMirror marks** — bold/italic/underline stored as metadata on text nodes, not as `**` characters
- **onWrapRef** — `MutableRefObject<((marker: string) => void) | null>` — toolbar calls `wrapRef.current?.("**")` which maps to `editor.chain().focus().toggleBold().run()`
- **MARKER_TO_COMMAND** — `{ "**": "toggleBold", "*": "toggleItalic", "_": "toggleUnderline" }` — maps marker strings to Tiptap chain commands
- **immediatelyRender: false** — disables SSR rendering to avoid Next.js hydration mismatch
- **suppressUpdateRef** — prevents feedback loop: when we call `setContent` externally, `onUpdate` fires async and would call `onChange("")`; we suppress it until after microtask queue clears

## 3. How it works

```
Toolbar B click
  → wrapRef.current("**")
  → wrapSelection("**")
  → MARKER_TO_COMMAND["**"] = "toggleBold"
  → editor.chain().focus().toggleBold().run()
  → Tiptap updates doc model
  → onUpdate fires
  → tiptapToMarkdown(editor.getJSON()) → "**selected text**"
  → onChange("**selected text**")

Paste (Ctrl+V)
  → ProseMirror handles natively — plain text pasted as paragraph nodes
  → onUpdate fires → tiptapToMarkdown → onChange

External value change (e.g. undo rollback from parent)
  → useEffect([value, editor]) fires
  → isFirstSyncRef skips first mount (content already set via `content` option)
  → subsequent changes: setContent(markdownToTiptap(value))
  → suppressUpdateRef = true → Promise.resolve().then(() => suppress = false)
```

## 4. Key decisions AGAINST

- **AGAINST contentEditable DIY**: DOM caret position ≠ raw string offset for formatted lines. `**bold**` = 8 chars in raw, `bold` = 4 chars in DOM. No reliable mapping possible.
- **AGAINST react-simple-code-editor**: Shows raw `**` markers while typing. textarea+pre overlay pattern — caret is in textarea (raw text), rendering in pre (HTML). Good for code, wrong for UX here.
- **AGAINST storing HTML**: DB and all consumers (MarkdownText, ProductDetailView, etc.) use markdown strings. Storing HTML would require migrating all existing data.
- **AGAINST Underline as separate import**: StarterKit v3 already includes Underline extension. Importing `@tiptap/extension-underline` separately causes "Duplicate extension names" warning.

## 4b. Global CSS override needed

`globals.css` has `p, span { color: hsl(var(--subTitle)) }` which overrides text color inside the ProseMirror editor. Fix in `globals.css`:

```css
.ProseMirror p {
  color: inherit;
}
```
