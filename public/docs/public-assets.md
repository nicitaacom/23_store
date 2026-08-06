# Public Assets

All static files served from `/public`. Files in `/public/sources/` are Photoshop source files — never served at runtime, kept for design iteration only.

---

## Unused images (not referenced in any app code)

These files exist on disk but have no `src` reference in `.tsx` / `.ts` files. Safe to delete or keep as design assets.

| File | Notes |
|---|---|
| `bitcoin.png` | Crypto payment icon — payment feature removed/shelved |
| `logo-dark-telegram.jpg` | Telegram logo variant — replaced by icon from react-icons |
| `metamask.png` | MetaMask logo — MetaMask payment removed |
| `solana.png` | Crypto payment icon — payment feature removed/shelved |
| `23_store-preview.mp4` | Demo video — not embedded in any page |

---

## Used images — root

| File | Used by |
|---|---|
| `404.png` | 404 page |
| `authentication-completed-dark.png` | Auth success screen (dark) |
| `authentication-completed-light.png` | Auth success screen (light) |
| `BiUserCircle-dark.svg` | Anonymous avatar placeholder (dark mode) — `AvatarDropdown` |
| `BiUserCircle-light.svg` | Anonymous avatar placeholder (light mode) — `AvatarDropdown` |
| `bnb.png` | BNB crypto payment button |
| `empty-cart.png` | Empty cart state |
| `error-checkmark.gif` | Error animation |
| `ethereum.png` | Ethereum crypto payment button |
| `faceit.png` | Faceit OAuth button |
| `google.png` | Google OAuth button |
| `joki-dark.png` | Joki brand logo (dark) |
| `joki-light.png` | Joki brand logo (light) |
| `logo-dark.png` | Site logo (dark) — Navbar |
| `logo-light.png` | Site logo (light) — Navbar |
| `mark-ticket-as-completed-dark.png` | Support ticket resolved illustration (dark) |
| `mark-ticket-as-completed-light.png` | Support ticket resolved illustration (light) |
| `no-image-fallback.png` | Product image fallback |
| `no-products-found-dark.png` | Empty state — no products found (dark) |
| `no-products-found-light.png` | Empty state — no products found (light) |
| `no-products-to-delete-dark.png` | Admin panel delete tab empty state (dark) |
| `no-products-to-delete-light.png` | Admin panel delete tab empty state (light) |
| `no-products-to-edit-dark.png` | Admin panel edit tab empty state (dark) |
| `no-products-to-edit-light.png` | Admin panel edit tab empty state (light) |
| `no-tickets-found-dark.png` | Support — no tickets empty state (dark) |
| `no-tickets-found-light.png` | Support — no tickets empty state (light) |
| `no-ticket-with-ticketId-found-dark.png` | Support — ticket not found (dark) |
| `no-ticket-with-ticketId-found-light.png` | Support — ticket not found (light) |
| `placeholder.jpg` | Generic image placeholder |
| `polygon.png` | Polygon crypto payment button |
| `read-your-messages.jpg` | Support — prompt to read messages |
| `recover-completed-dark.png` | Password recovery success (dark) |
| `recover-completed-light.png` | Password recovery success (light) |
| `success-checkmark.gif` | Success animation |
| `ticket-completed-dark.png` | Ticket closed illustration (dark) |
| `ticket-completed-light.png` | Ticket closed illustration (light) |
| `twitter.png` | Twitter/X social link |

---

## Used images — languages/

| File | Used by |
|---|---|
| `languages/EN.jpg` | `LanguageDropdown` — English locale flag |
| `languages/FI.svg` | `LanguageDropdown` — Finnish locale flag |
| `languages/RU.png` | `LanguageDropdown` — Russian locale flag |
| `languages/SE.png` | `LanguageDropdown` — Swedish locale flag |

---

## Used images — subfolders

| File | Used by |
|---|---|
| `banners/banner-1.gif` | Homepage banner carousel |
| `banners/banner-2.gif` | Homepage banner carousel |
| `banners/banner-3.png` | Homepage banner carousel |
| `errors/email-link-invalid-or-has-expired-dark.jpg` | Auth error page (dark) |
| `errors/email-link-invalid-or-has-expired-icon-dark.png` | Auth error page icon (dark) |
| `errors/email-link-invalid-or-has-expired-icon-light.png` | Auth error page icon (light) |
| `errors/email-link-invalid-or-has-expired-light.jpg` | Auth error page (light) |
| `errors/invalid-flow-state-found-dark.jpg` | Auth error page (dark) |
| `errors/invalid-flow-state-found-icon-dark.png` | Auth error page icon (dark) |
| `errors/invalid-flow-state-found-icon-light.png` | Auth error page icon (light) |
| `errors/invalid-flow-state-found-light.jpg` | Auth error page (light) |
| `errors/no-code-found-to-exchange-cookies-for-session-dark.jpg` | Auth error page (dark) |
| `errors/no-code-found-to-exchange-cookies-for-session-icon-dark.png` | Auth error page icon (dark) |
| `errors/no-code-found-to-exchange-cookies-for-session-icon-light.png` | Auth error page icon (light) |
| `errors/no-code-found-to-exchange-cookies-for-session-light.jpg` | Auth error page (light) |
| `errors/user-not-found-after-exchanging-cookies-dark.jpg` | Auth error page (dark) |
| `errors/user-not-found-after-exchanging-cookies-icon-dark.png` | Auth error page icon (dark) |
| `errors/user-not-found-after-exchanging-cookies-icon-light.png` | Auth error page icon (light) |
| `errors/user-not-found-after-exchanging-cookies-light.jpg` | Auth error page (light) |
| `docs/AdminPanel/AddProduct.png` | dev_readme for admin panel add tab |
| `docs/AdminPanel/DeleteProduct.png` | dev_readme for admin panel delete tab |
| `docs/AdminPanel/EditProduct.png` | dev_readme for admin panel edit tab |
| `docs/auth/db-23_users.png` | dev_readme for auth — DB screenshot |
| `docs/cart/CartModal.png` | dev_readme for CartModal — UI screenshot |
| `docs/cart/db-23_users_cart.png` | dev_readme for cart — DB screenshot |
| `docs/products/Products.png` | dev_readme for create-product — products UI screenshot |
| `docs/products/db-23_products.png` | dev_readme for create-product — DB screenshot |
| `docs/support/db-23_messages.png` | dev_readme for support — DB messages screenshot |
| `docs/support/db-23_tickets.png` | dev_readme for support — DB tickets screenshot |
| `docs/support/support-image-upload-workflow.png` | `dev_readme-supbase-sql.md` — support chat images bucket/folder diagram, AI-generated from plan-22 §5 prompt 1 |
| `docs/customer/how-to-install-metamask/step-1.png` | MetaMask install guide step 1 |
| `docs/customer/how-to-install-metamask/step-2.jpg` | MetaMask install guide step 2 |
| `projects/AI.png` | Portfolio project card — AI project |
| `projects/J.png` | Portfolio project card — J project |
| `projects/spotify.png` | Portfolio project card — Spotify project |

---

## Design sources (never served at runtime)

`public/sources/` contains `.psd` files and raw layer assets used to produce the final exported images above. Keep them for design changes; they are not deployed.
