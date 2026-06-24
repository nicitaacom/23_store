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

### Docs structure:

0. why this exists (problem it solves, in plain words)

1. how does it look like?

   1.1 image of UI + file pathname for component
   1.2 types + file pathname
   1.3 ASCII tree - directory (file pathname) where data lives e.g redis DB or EB or zustand store tree to component UI
   1.4 use images to show how data looks in each store (redis screenshot, supabase screenshot, EB screenshot)

2. define termininology
3. explain with ASCII examples how it should work
4. TODO with reproduction steps and decisions made AGAINST
