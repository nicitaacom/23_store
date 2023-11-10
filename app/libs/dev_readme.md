## When you should use libs folder

You should use this folder only for some dependencies you install with `pnpm i dependency-name`

## When you should NOT use libs folder

If you create some file not related to some dependency from `package.json`
For examples see files in this folder

<br/>

---

<br/>

## How to use stripe

if you want to do something with stripe just google smth like

1. `how to create product on stripe`
2. Go to the first link in google
3. e.g in [this guide](https://stripe.com/docs/api/products/create) you see

```ts
const stripe = require("stripe")(
  "sk_test_51NUvmbDEq5VtEmnoPpiL47UpmArBVixTaRVYstuNf8VNN4KI6u3su1lo6RknsBQ9b1yLtsYKWE2ZB5my7hRoigtS00bUSPqKam",
)

const product = await stripe.products.create({
  name: "Gold Special",
})
```

4. As you already have set up for stripe in stripe.ts - just use stripe using stripe docs in `api` folder

## How to use stripe

if you want to do something with stripe just google smth like

1. `how to create product on stripe`
2. Go to the first link in google
3. e.g in [this guide](https://stripe.com/docs/api/products/create) you see

```ts
const stripe = require("stripe")(
  "sk_test_51NUvmbDEq5VtEmnoPpiL47UpmArBVixTaRVYstuNf8VNN4KI6u3su1lo6RknsBQ9b1yLtsYKWE2ZB5my7hRoigtS00bUSPqKam",
)

const product = await stripe.products.create({
  name: "Gold Special",
})
```

4. As you already have set up for stripe in stripe.ts - just use stripe using stripe docs in `api` folder

## How to use supabase

Naming tells for themselfs

`SupabaseClient` - use in client components with 'use client'
`SupabaseServer` - use in server components without 'use client'
usually you use in in page.tsx or layout.tsx to preload some data on SSR
`SupabaseServerAction` - use this file in server action with 'use server'
lso I use it in route hadlers (api folder) because I see no difference between them

To do something in DB (supabase) - just google about it as well e.g

1. `How to insert row in supabase`
2. Open [first link](https://supabase.com/docs/reference/javascript/insert)
3. Use it like so - instead supabase write `SupabaseClient` or `SupabaseServer` or `SupabaseServerAction`

```ts
const { error } = await supabase.from("countries").insert({ id: 1, name: "Denmark" })
```

4. Throw error if needed

```ts
if (error) throw error
```
