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
