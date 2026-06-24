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

### dev_readme map

When you get a screenshot or a question, find the matching feature here first instead of running `find`. Each folder documents itself in its own `dev_readme*.md`. Keep this map updated whenever you add or move a dev_readme.

| Area | Path | Covers |
|---|---|---|
| Root overview | [dev_readme.md](dev_readme.md) | Top-level project docs entry point |
| Supabase / SQL | [dev_readme-supbase-sql.md](dev_readme-supbase-sql.md) | All DB tables, RLS, indexes, buckets, functions, email templates |
| Backup/restore | [dev_readme-backup.md](dev_readme-backup.md) | DB backup & restore (ADMIN only) |
| Server actions | [app/actions/dev_readme.md](app/actions/dev_readme.md) | Server action usage (e.g. getInitialMessages) |
| API routes | [app/api/dev_readme.md](app/api/dev_readme.md) | API route conventions |
| Components (root) | [app/components/dev_readme.md](app/components/dev_readme.md) | ClientOnly and shared component notes |
| Navbar | [app/components/Navbar/components/dev_readme.md](app/components/Navbar/components/dev_readme.md) | Navbar components |
| Skeletons | [app/components/Skeletons/dev_readme.md](app/components/Skeletons/dev_readme.md) | Skeleton/loader components |
| SupportButton | [app/components/SupportButton/dev_readme-turnstile.md](app/components/SupportButton/dev_readme-turnstile.md) | SupportButton + Turnstile |
| ui | [app/components/ui/dev_readme.md](app/components/ui/dev_readme.md) | components/ui folder usage |
| Inputs | [app/components/ui/Inputs/dev_readme.md](app/components/ui/Inputs/dev_readme.md) | Input.tsx usage |
| Validation inputs | [app/components/ui/Inputs/Validation/dev_readme.md](app/components/ui/Inputs/Validation/dev_readme.md) | FormInput / ProductInput validation |
| AdminPanel modal | [app/components/ui/Modals/AdminPanel/dev_readme-adminPanel.md](app/components/ui/Modals/AdminPanel/dev_readme-adminPanel.md) | Admin panel: add/edit/delete products, variant editing, per-variant stock |
| CartModal | [app/components/ui/Modals/CartModal/dev_readme.md](app/components/ui/Modals/CartModal/dev_readme.md) | Cart modal flow |
| Modals (query-param) | [app/components/ui/Modals/dev_readme.md](app/components/ui/Modals/dev_readme.md) | Query-param modal pattern |
| Modal containers | [app/components/ui/Modals/ModalContainers/dev_readme.md](app/components/ui/Modals/ModalContainers/dev_readme.md) | Modal container primitives |
| constant | [app/constant/dev_readme.md](app/constant/dev_readme.md) | When not to use constants folder |
| emails | [app/emails/dev_readme.md](app/emails/dev_readme.md) | How to create email templates |
| Create product pipeline | [app/functions/dev_readme-create-product.md](app/functions/dev_readme-create-product.md) | Product creation pipeline incl. variant images |
| hooks | [app/hooks/dev_readme.md](app/hooks/dev_readme.md) | hooks folder structure |
| ui hooks | [app/hooks/ui/dev_readme.md](app/hooks/ui/dev_readme.md) | UI hook usage |
| libs | [app/libs/dev_readme.md](app/libs/dev_readme.md) | libs folder |
| Auth callback | [app/[locale]/(auth)/auth/callback/dev_readme.md](app/[locale]/(auth)/auth/callback/dev_readme.md) | OAuth/credentials callback |
| Auth | [app/[locale]/(auth)/auth/dev_readme.md](app/[locale]/(auth)/auth/dev_readme.md) | Auth callback folder usage |
| i18n | [app/locales/dev_readme_i18n.md](app/locales/dev_readme_i18n.md) | i18n setup + locale-line rule |
| Product/site components | [app/[locale]/(site)/components/dev_readme.md](app/[locale]/(site)/components/dev_readme.md) | Why Product.tsx isn't split; product row + variants |
| Site / cart UX | [app/[locale]/(site)/dev_readme.md](app/[locale]/(site)/dev_readme.md) | User cart functionality |
| UTM stats | [app/[locale]/(site)/stats/dev_readme-utm.md](app/[locale]/(site)/stats/dev_readme-utm.md) | UTM stats |
| Popular products | [app/[locale]/(site)/popular-products/dev_readme.md](app/[locale]/(site)/popular-products/dev_readme.md) | Likes/ratings, popular = most likes, PopularProductCard |
| Support | [app/[locale]/(support)/support/dev_readme.md](app/[locale]/(support)/support/dev_readme.md) | Support area |
| Support tickets | [app/[locale]/(support)/support/tickets/components/dev_readme.md](app/[locale]/(support)/support/tickets/components/dev_readme.md) | Ticket sidebar/components |
| providers | [app/providers/dev_readme.md](app/providers/dev_readme.md) | Providers usage |
| ui stores | [app/store/ui/dev_readme.md](app/store/ui/dev_readme.md) | UI Zustand stores |
| ts | [app/ts/dev_readme.md](app/ts/dev_readme.md) | Shared interfaces/types |
| utils | [app/utils/dev_readme.md](app/utils/dev_readme.md) | When to use utils folder |
