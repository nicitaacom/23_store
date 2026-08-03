# plan-18 — wire Solana payments into CartModal

**Priority:** P1
**Screenshot:** none — triggered by the `no-unused-dependencies` eslint rule flagging `@solana/web3.js` at `package.json:55`; Nikita confirmed it is meant to be used, not removed.
**Recommended model:** Sonnet · medium thinking — the shape to copy already exists (`PayWithMetamaskButton.tsx` + `sendMoneyWithMetamask.ts`); the care point is not reviving the private-key code path, not inventing new architecture.
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** — (answers to the Open Questions below gate step 1)

## §0 Root cause / why this file exists

`@solana/web3.js` was added to `package.json:55` for a Solana payment option that was never finished.
What's actually in the tree today:

- `app/components/ui/Modals/CartModal/PaymentButtons/functions/sendMoneyWithMetamask.ts:24-27` defines
  `SOLANA = "0x1"` — identical to `ETH_MAINNET` on line 24. `0x1` is an EVM chain id; Solana has no EVM
  chain id, and the switch always matches `ETH_MAINNET` first, so `case SOLANA:` at line 42 is unreachable
  — not a working branch.
- Lines 73-100 (commented out) call `Keypair.fromSecretKey(Uint8Array.from(wallet.secret))` — signing a
  transaction from a raw secret key that would have to live in the browser. That is a private-key-in-the-
  browser design and must not be revived.
- `TWallet.secret?: number[]` (`app/ts/types/TWallet.ts:5`) exists only to feed that commented block — no
  other file reads it (`grep -rn "wallet.secret" app` returns only the three commented lines above).
- `PaymentButtons.tsx` renders MetaMask, PayPal, Stripe — no Solana button.
- A `solana.png` icon already sits in `public/`, unused — sized and styled to match `ethereum.png` /
  `bnb.png` / `polygon.png`.

This plan adds a real `PayWithSolanaButton` that signs through a wallet the user controls (Phantom or
another Solana wallet), never a raw secret key, and removes the two defects above instead of building on
top of them.

## §1 Where it lives / what changes

| Piece | File | Change |
| --- | --- | --- |
| Button list | `PaymentButtons/PaymentButtons.tsx:11` | add `<PayWithSolanaButton />` next to `<PayWithMetamaskButton />` |
| New button | `PaymentButtons/components/PayWithSolanaButton.tsx` | NEW — same shape as `PayWithMetamaskButton.tsx` |
| New send fn | `PaymentButtons/functions/sendMoneyWithSolana.ts` | NEW — same shape as `sendMoneyWithMetamask.ts`, Solana-only, no EVM chain-id branching |
| Defect #1 + #2 removed | `PaymentButtons/functions/sendMoneyWithMetamask.ts:27,42-44,73-100` | DELETE `SOLANA` const, `case SOLANA`, commented `Keypair` block |
| Unused field removed | `app/ts/types/TWallet.ts:5` | DELETE `secret?: number[]` (no remaining importer) |
| Recipient address | `env.d.ts:38` (hand-off — files named `*env*` are hard-blocked for me) | ADD one new `NEXT_PUBLIC_...` var, name per Open Question 5 |
| Copy | `app/locales/en.ts` / `fi.ts` / `ru.ts` / `se.ts`, `payment.*` scope | ADD any new toast strings the Solana button needs (no-provider, wrong-network, etc. — mirror the existing `payment.error.metamask_*` keys) |
| Docs | `CartModal/dev_readme.md` | mention Solana explicitly next to "Stripe + crypto checkout buttons" |
| Packages | `package.json` | `pnpm add` only if Open Question 1 picks the wallet-adapter option |

## §2 Terminology

- **Injected provider** — a wallet browser extension exposing itself on `window` (MetaMask → `window.ethereum`, Phantom → `window.solana`). The existing MetaMask button already uses this pattern via `detectEthereumProvider`.
- **Wallet Standard / wallet-adapter** — the official `@solana/wallet-adapter-*` package family that auto-discovers any compliant wallet extension (Phantom, Solflare, Backpack, …) instead of hard-coding one `window.*` global.
- **Lamports** — Solana's smallest unit (1 SOL = 10^9 lamports), the direct analogue of wei.
- **SPL token** — Solana's fungible-token standard; USDC-on-Solana is an SPL token, not the native coin, and needs an associated-token-account transfer instead of a native SOL transfer.

## §3 Before / after

```
BEFORE                                          AFTER
PaymentButtons.tsx                              PaymentButtons.tsx
 ├─ PayWithMetamaskButton (ETH/BNB/MATIC)         ├─ PayWithMetamaskButton (ETH/BNB/MATIC)
 ├─ PayWithPaypalButton                           ├─ PayWithSolanaButton (SOL)          <- NEW
 └─ PayWithStripeButton                           ├─ PayWithPaypalButton
                                                   └─ PayWithStripeButton

sendMoneyWithMetamask.ts                        sendMoneyWithMetamask.ts
 SOLANA = "0x1"  <- same as ETH_MAINNET,          (SOLANA const + case + commented block
 case SOLANA: unreachable                          removed — EVM-only again)
 commented Keypair.fromSecretKey(wallet.secret)
 block using a raw private key                  sendMoneyWithSolana.ts                <- NEW
                                                  Connection + Transaction, signed by the
                                                  connected wallet — no private key ever
                                                  enters this codebase

TWallet.ts                                      TWallet.ts
 secret?: number[]  <- unused outside the        (field removed)
 commented block above
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Review phrase: "approved - continue".

1. **Unblock.** Wait for Nikita's answers to the 5 Open Questions below — they decide which wallet
   library step 3 imports, which network/RPC step 3 points at, whether step 3 needs one token or two,
   whether step 6 (server verification) exists at all, and what step 5's env var is named. STOP — no diff
   in this step, it only gates the rest.
2. **Remove the two defects.** In `sendMoneyWithMetamask.ts` delete the `SOLANA` const, `case SOLANA`, and
   the whole commented `if (chainToken === "SOL")` block — the function goes back to being EVM-only. In
   `TWallet.ts` delete `secret?: number[]`. STOP.
3. **`sendMoneyWithSolana.ts`.** Same shape as `sendMoneyWithMetamask.ts` (same toast/i18n/try-catch
   pattern): price via `productsSDK.getCoinmarketcapQuote({ amount: productsPrice, symbol: "USD", convert:
   "SOL" })`, convert to lamports, build + send a `SystemProgram.transfer` through whichever
   connect/sign method Open Question 1 picked, wait for confirmation. On success either redirect
   (`router.push('/payment?status=success')`) or call the new verification route, per Open Question 4.
   STOP.
4. **`PayWithSolanaButton.tsx`.** Same shape as `PayWithMetamaskButton.tsx` — provider detection, a
   connect step before a send step, the existing `solana.png` icon, same `useLoading`/`useToast` wiring.
   Wire it into `PaymentButtons.tsx`. STOP.
5. **Env + locale.** Hand Nikita the exact line to paste into `env.d.ts` (name per Open Question 5) — that
   file is hard-blocked for me to edit directly. Add any new `payment.error.*` strings this button needs
   to all 4 locale files. STOP.
6. **Server-side verification** — only if Open Question 4 = "verify first". New route (e.g.
   `app/api/payment/verify-solana/route.ts`) that takes a signature, calls `connection.getTransaction` /
   `getSignatureStatuses`, checks recipient address + lamport amount against the priced cart before
   `sendMoneyWithSolana.ts` redirects. STOP. Skip this step entirely if Open Question 4 = "same as
   MetaMask today".
7. **Document it.** Update `CartModal/dev_readme.md` to name Solana explicitly. STOP.

## Decisions made (do not re-open)

Nikita, verbatim: "I'd go with A everywhere (recommended)"

1. **Wallet connection** — A: direct `window.solana` (Phantom's own API). Zero new packages;
   `@solana/web3.js` (already installed) builds the `Connection`/`Transaction`. Mirrors
   `PayWithMetamaskButton.tsx` 1:1 (same `detect → connect → send` shape). Limited to Phantom and any
   wallet that injects `window.solana` in Phantom-compatible mode.
2. **Network** — A: devnet first, flip to mainnet later via one env var. Free faucet SOL, zero real-money
   risk while testing the flow end to end.
3. **RPC endpoint** — A: public cluster endpoint (`https://api.mainnet-beta.solana.com` / `-devnet`). Free,
   no signup, rate-limited — fine at today's order volume.
4. **Order verification** — A: same trust model as MetaMask today. The wallet returns a signature, the
   client pushes to `/payment?status=success` directly, no server check (see
   `sendMoneyWithMetamask.ts:126` for the exact behavior being matched).
5. **Recipient address env var name** — A: `NEXT_PUBLIC_SOLANA_ADDRESS`. Accurate — Phantom is not
   MetaMask, so a `METAMASK`-prefixed name would mislabel it.
6. **Token scope** — A: SOL only for v1. One native token per chain, same shape as ETH/BNB/MATIC.

Nikita, verbatim: "also I'd use coinmarketcap API in order to get live price SOL/USDT"

- Confirmed: `sendMoneyWithSolana.ts` prices the cart through `productsSDK.getCoinmarketcapQuote` — the
  same CMC-backed method `sendMoneyWithMetamask.ts` already calls for ETH/BNB/MATIC. No hardcoded or
  static SOL price anywhere in this feature.

7. **Shape of the CMC call for the SOL price** — A: same shape as ETH/BNB/MATIC.
   `getCoinmarketcapQuote({ amount: productsPrice, symbol: "USD", convert: "SOL" })`, one call, returns the
   SOL quantity equivalent to the cart's USD total directly. Matches `sendMoneyWithMetamask.ts:52-56`
   exactly — same file shape, same reasoning, no new UI element on the button.

All 7 decisions are settled. Nothing left to ask before step 2 starts.

## Code patterns to follow

- `dev_readme-code-patterns.md` — all 15 rules (early returns, no 1-letter names, banned-words list,
  string-error-over-throw where the file already does that).
- `good-bad-examples.md` — `<fnName>Resp` naming, hook-call ordering (`toast` first), no vague
  `data`/`result`.
- `CartModal/dev_readme.md` — the directory this plan extends.

Read them BEFORE coding; validate the final diff line-by-line before saying done.

➡️ Next plan: — (back to [plan-00-tracker.md](plan-00-tracker.md))
