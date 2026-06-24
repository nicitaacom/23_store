## Usage for productValidation

### 0. Why this exists

Product titles and descriptions accept only a curated set of characters so the DB and UI don't get
garbage. The regex-based rules live here so `ProductInput.tsx` and future callers share one source of
truth instead of duplicating patterns.

### 1. What it looks like

File: [app/utils/productValidation.ts](productValidation.ts)
Used by: [app/components/ui/Inputs/Validation/ProductInput.tsx](../components/ui/Inputs/Validation/ProductInput.tsx)

### 2. Allowed characters

| Field | Allowed set |
|---|---|
| Title | `A-Za-z0-9 # % $ ( ) _ + & / , . ' ' - = \| –` (must start with alphanumeric, must contain a letter) |
| Description | `A-Za-z0-9 - : . , ( ) # @ & % / " ' \` ~ [ ] > < = + ! ? * _ ; \n` |

### 3. How to extend (add a new allowed character to the title)

Two places must stay in sync in `productValidation.ts`:

1. `PRODUCT_TITLE_INVALID_CHARACTER_REGEX` — add the char to the negated character class `[^…]`
2. `PRODUCT_TITLE_PATTERN` — add the same char to the repeated character class `[A-Za-z0-9…]{…}`

Example — `&`, `=`, and curly apostrophe `'` were added the same way: add to both regexes.

---

## When you should use utils folder

If you create something not related to some dependency from `package.json`
For examples see files in this folder

## Usage for currencyFormatter

This file needed to format price from `199999.99` to this `$1,999,99.99`

## Usage for formatDeliveryDate

This file needed to add 20 days from current date and one more day if Saturday
and get output from this 11/24/2023 to this 24.11.2023

## Usage for formatMetamaskBalance

This file needed to fomat metamask balance
(I copy pasted this file from [this guide](https://docs.metamask.io/wallet/tutorials/react-dapp-local-state/#5-manage-more-metamask-state))

## Usage for formatTime

This function turns this `2023-11-12T08:41:03.348842+00:00` into `09:41`

## Usage for getStorage

Just incaplulated logic to do stuff related to getting and setting cart
You may find how logic for user's cart works - in `app/(site)/dev_readme.md`

## Usage for helpers

Any helpers you need - I created getURL because Antonio use the same setup
to create-checkout-session in [spotify clone](https://youtu.be/2aeMRB8LL4o?t=18271)
