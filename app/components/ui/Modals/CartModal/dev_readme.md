# CartModal — Dev Readme

## 0. Why this exists

The cart modal lets users review items they've added, adjust quantities, clear the cart, and proceed to checkout (crypto or Stripe). It opens via the cart icon in the Navbar and is driven by query param `modal=CartModal`.

---

## 1. How does it look

![CartModal UI](../../../../../public/docs/cart/CartModal.png)
`public/docs/cart/CartModal.png` — `app/components/ui/Modals/CartModal/CartModal.tsx`

![23_users_cart DB](../../../../../public/docs/cart/db-23_users_cart.png)
`public/docs/cart/db-23_users_cart.png` — Supabase `23_users_cart` table

---

## 2. Where data lives

```
Supabase DB 23_users_cart
  id           UUID  FK -> auth.users(id)
  cart_products JSONB  { [productId]: { quantity, price, title, img_url, variant } }

Zustand cartStore  (app/store/ui/cartStore.ts)
  cartProducts: Record<string, CartProduct>
  -> synced to DB on every change via debounced upsert
```

---

## 3. Directory

```
app/components/ui/Modals/CartModal/
  CartModal.tsx        <- shell: empty state vs product list
  EmptyCart.tsx        <- empty state illustration
  ProductsInCart.tsx   <- list of cart items with quantity controls
  PaymentButtons/      <- Stripe + crypto checkout buttons
  functions/           <- cart helpers (add, remove, clear, upsert to DB)
```

---

## 4. How to open

Cart modal uses the query-param pattern (see `app/components/ui/Modals/dev_readme.md`).

```
Navbar cart icon -> href adds ?modal=CartModal
ModalsProvider renders <CartModal /> when searchParams includes "CartModal"
```
