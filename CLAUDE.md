Refer to `./docs` - there you find code patterns

1. Follow DRY SOLID KISS best practices.
2. Follow this code pattern
   Good:

```tsx
 const rateLimitSDK = new RateLimitSDK()
 const handleDelete = useCallback((id: string) => {
    try {
        ...
    }
    catch(error) { // note I use error - not e - not err

    }
  }, [])

const renderedItems = useMemo(() =>
  items.map(item => <ItemRow key={item.id} item={item} onDelete={handleDelete} />), // note that I use item - not i
  [items] // don't add fn to deps
)

if (isSkeleton) return <p className="...">Loading...</p> // note className is first argument
if (!items.length) return <EmptyState image={...} label="No items yet" />
return <ul>{renderedItems}</ul>
```

Docs structure:

0. why this exists (problem it solves, in plain words)

1. define where data lives e.g redis DB or EB or zustand store

- types
- show directories for UI where data rendered
- use images to show how data looks in each store (redis screenshot, supabase screenshot, EB screenshot)
- use images to show where data renders in UI (scheduled tab, outreached page, etc.) - include file directories
- add terminology table right below (so AI reading this section has the vocab before reading the ASCII)
- for each store: explain WHY it exists there (not just what it holds)

2. TODO and decisions made AGAINST
3. define termininology - explain with ASCII examples how it should work
4. reproduction steps - examples with ASCII of how it work
