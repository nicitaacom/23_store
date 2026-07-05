### Shared look — `BaseInput.tsx`

`Input`, `FormInput`, `SearchInput` and the variant inputs all compose [BaseInput.tsx](BaseInput.tsx) —
one component that owns the shared text-input look (lighter "soft card" vibe: soft corners + border,
soft GREEN/brand focus ring) and forwards `ref` + the rest of the props. Change the look there once and
every shared input follows. We do NOT share styling through an exported className string — use the
component.

```tsx
<BaseInput className="min-w-0 flex-1" value={value} onChange={onChange} />
```

`ProductInput` (Inputs/Validation) is intentionally NOT on `BaseInput` — it keeps its own hardcoded
dark style for the AdminPanel forms. `MessageInput` is a chat-specific textarea, also separate.

### MessageInput.tsx

The shared chat composer for BOTH the customer chat window and the support reply footer. Value + image
live in `useMessagesStore`. Props:

- `placeholder?` — textarea placeholder (defaults to "Type a new message...").
- `onSend?(messageBody, image)` — when set, the composer clears its value, resets height, and calls
  this (the support reply path). **Omitting `onSend` runs the customer flow unchanged** —
  `uploadImagesAndSendMessage` with the same arguments as before.

```tsx
// customer chat window
<MessageInput placeholder={t("message_placeholder")} />
// support reply
<MessageInput onSend={handleSend} placeholder={t("reply_placeholder")} />
```

### Usage for Input.tsx

Use Inputs/Validation for inputs with validation

```tsx
  const [search, setSearch] = useState('') //example

      <Input
      startIcon={<BiSearchAlt size={24} />}
      className="hidden tablet:flex w-[40vw] max-w-[600px]"
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="Search..."
    />
  <p>Search:{search}</p>

```

### Usage for SearchInput.tsx

```tsx
async function searchProducts(formData: FormData) {
  "use server"

  const searchQuery = formData.get("searchQuery")?.toString()

  if (searchQuery === "") {
    redirect("/")
  }

  if (searchQuery) {
    redirect("/search?query=" + searchQuery)
  }
}

<form action={searchProducts}>
  <SearchInput
    className="hidden tablet:flex w-[40vw] max-w-[600px]"
    startIcon={<BiSearchAlt size={24} />}
    endIcon={Children}
    name="searchQuery"
    placeholder="Search..."
  />
</form>
```
