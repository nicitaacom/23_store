# translate-field API route

## 0. Why this exists

When the owner edits a product title or description, the change must be translated into all 4 locales (en, fi, ru, se) automatically via GPT. A single generic route handles both fields — DRY over two separate routes (`translate-title` + `translate-description`).

Replaces the old `translate-description` route (deleted).

## 1. How does it look like?

### 1.1 File pathnames

- Route — [app/api/products/translate-field/route.ts](route.ts)
- SDK method — [app/sdk/ProductsSDK/ProductsSDK.ts](../../../sdk/ProductsSDK/ProductsSDK.ts) → `translateField()`
- Types — [app/ts/namespaces/api/products/api.d.ts](../../../ts/namespaces/api/products/api.d.ts) → `ProductsTranslateFieldRequest / Response`

### 1.2 Types

```ts
type ProductsTranslateFieldRequest = {
  productId: string
  field: "title" | "description"
  value: string // the edited text in the current locale
  translations: ProductsTranslations // current full translations object
}

type ProductsTranslateFieldResponse = { product: TProductDB } | { error: string }
```

### 1.3 Data flow

```
FormatTitleForm / FormatDescriptionForm
  │  productsSDK.translateField({ productId, field, value, translations })
  ▼
POST /api/products/translate-field
  │  GPT: translate `value` into en/fi/ru/se
  │  merge into translations: { ...locale, [field]: parsed[locale] }
  │  supabase.update({ translations: merged })
  ▼
response.product  →  replaceProduct(id, product)  →  ownerProductsStore
```

## 2. Terminology

- **field** — `"title"` or `"description"` — which translation key to update across all locales
- **SYSTEM_PROMPTS** — per-field GPT system prompt; description prompt includes markdown preservation instruction
- **cleaned** — raw GPT output with markdown code fences stripped (`\`\`\`json ... \`\`\`` → raw JSON)

## 3. How it works

```
GPT input:  "Men's Hydrating Skincare Formula"
GPT output: {"en":"...","fi":"...","ru":"...","se":"..."}

merge strategy:
  en: { ...body.translations.en, [field]: parsed.en }
  fi: { ...body.translations.fi, [field]: parsed.fi }
  ...

→ other field (title or description) is preserved from existing translations
```

## 4. TODO / decided against

- **AGAINST separate translate-title route**: identical logic, one route with `field` param is DRY
- **Response format**: request strict Structured Outputs with exactly the `en`, `fi`, `ru`, and `se` string fields, then validate all four values are non-empty before updating Supabase. Continue stripping code fences defensively.
- **Bounded automatic retry**: make at most two real provider requests. The first request has a 45-second timeout; one retry has a 90-second timeout and a larger completion-token allowance. Disable SDK-internal retries so the route owns the attempt count. Retry malformed/incomplete output and transient connection, timeout, rate-limit, conflict, or server errors. Do not retry missing credits, rejected credentials, invalid input, or other permanent errors.
- **Failure messages**: never return the model's raw output or provider internals to the browser. After retry exhaustion, explain that saved product text is unchanged and give the appropriate next step. The product row is not updated unless all four translations validate.
- **Responsive editing**: title and description translation use field-local busy state. The active field prevents duplicate submissions, while the rest of the Admin Panel stays interactive during the provider request.
- **Function deadline**: the route allows up to 165 seconds for both provider attempts, a bounded provider backoff, and their overhead; the deployed platform must permit that duration.
