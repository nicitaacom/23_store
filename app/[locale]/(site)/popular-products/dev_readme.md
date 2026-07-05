# Popular products — likes & ratings

## 0. Why this exists

`/popular-products` is the storefront feed. "Popular" = **most-liked products first**. Users can:

- **Like** a product (heart) — only if they have NOT bought it.
- **Rate** a product 1–5 stars — only if they HAVE bought it (one rating per user).

Likes drive the ordering; ratings give each product an average star score.

## 1. How it looks / where things are

- Page (server, initial fetch) — [page.tsx](page.tsx) → `fetchPopularProducts` ([app/libs/popularProducts.ts](../../../libs/popularProducts.ts))
- Infinite feed (lazy load) — [PopularProductsLazyFeed.tsx](PopularProductsLazyFeed.tsx) → renders a grid of
  [components/PopularProductCard.tsx](components/PopularProductCard.tsx)
- More pages fetched via `productsSDK.getPopularProducts` → [app/api/popular-products/route.ts](../../../api/popular-products/route.ts)

The card is the "big title + feature rows + bottom action" reference design: square image banner, title,
description, price, a likes / avg-rating summary, the rate panel (buyers) and a "View product" action.

## 2. Data model (counters on 23_products)

Per-user like/rating **dedup is client-side** (localStorage) — same lightweight approach as the cart and
likes. The DB only holds global counters. Full SQL + RPCs: [dev_readme-supbase-sql.md](../../../../dev_readme-supbase-sql.md).

```
23_products
  likes_count   INTEGER  total likes        → ORDER BY likes_count DESC = "popular"
  rating_sum    INTEGER  sum of all stars    ┐ avg = rating_sum / rating_count
  rating_count  INTEGER  number of ratings   ┘
```

RPCs (atomic so concurrent bumps don't clobber):

- `increment_product_likes(p_id, delta)` — +1 like / -1 unlike (clamped ≥ 0)
- `add_product_rating(p_id, stars)` — `rating_sum += stars`, `rating_count += 1`

## 3. Client flow (ASCII)

```
LIKE  (not bought)                         RATE  (bought)
ProductLikeButton                          PopularProductCard stars
  ├─ likedProductsStore.toggle (local)       ├─ ratedProductsStore.setProductRating (local, once)
  └─ rpc increment_product_likes(±1)         └─ rpc add_product_rating(stars)

"bought?"  ← usePurchasedProductsStore (localStorage)
            written on payment success step 7 (app/[locale]/(site)/payment/hooks/usePaymentSteps.tsx)
```

Stores (all `app/store/user/`, localStorage-persisted):

- `likedProductsStore` — which products I liked (heart state)
- `ratedProductsStore` — my star rating per product (one per product)
- `purchasedProductsStore` — products I bought (gates like vs rate)

## 4. Ordering — keep in sync

Both the initial fetch ([popularProducts.ts](../../../libs/popularProducts.ts)) and the lazy-load route
([route.ts](../../../api/popular-products/route.ts)) order by `likes_count DESC, on_stock DESC`. If you
change one, change the other or paging will skip/repeat rows. (The old alphabetical
`sortProductsByLocale` re-sort was removed here — it would override the likes order per page.)

## 5. Decisions AGAINST/FOR

- **AGAINST: server-side per-user dedup / an orders table.** No orders table exists; purchases are tracked
  client-side to match the app's existing likes/cart altitude. Trade-off: counters can be gamed by clearing
  localStorage. Acceptable for a storefront preview; revisit if abuse appears.
- TODO (if needed): move like/rating dedup server-side (a `23_product_reactions` table) for trustworthy counts.
