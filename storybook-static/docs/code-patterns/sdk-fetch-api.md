
Always prefer this pattern:

1. Create or reuse an SDK class for the entity.
2. Put native `fetch` calls inside SDK methods only.
3. SDK methods should call API routes.
4. Request bodies should use `satisfies API.XRequest`.
5. API request/response types should live in `app/ts/namespaces/api/<entity>/api.d.ts`.
6. API routes should live in folders like `app/api/<entity>/<action>/route.ts` with helper files next to them.

Example SDK pattern:

```ts
export class ProductsSDK {
  async selectDBProducts(start: number, end: number) {
    const response = await fetch(`/api/products/select?start=${start}&end=${end}`, {
      method: "GET",
      cache: "no-store",
    })

    const responseJson: API.ProductsSelectResponse = await response.json()
    if ("error" in responseJson) return responseJson.error
    else return responseJson
  }

  async addProduct(request: API.ProductsAddRequest) {
    const response = await fetch("/api/products/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request satisfies API.ProductsAddRequest),
      cache: "no-store",
    })

    const responseJson: API.ProductsAddResponse = await response.json()
    if ("error" in responseJson) return responseJson.error
    else return responseJson
  }
}
```

Example API namespace structure:

```ts
app/ts/namespaces/api
├── products
│   └── api.d.ts
├── support
│   └── api.d.ts
├── emails
│   └── api.d.ts
└── utm
    └── api.d.ts
```

Example API route pattern:

```ts
import { NextResponse } from "next/server"
import { selectDBProducts } from "./selectDBProducts"

export async function POST(req: Request) {
  const body = (await req.json()) as API.ProductsSelectRequest

  if (!body.ownerId || typeof body.ownerId !== "string") {
    return NextResponse.json({ error: `ownerId missing: ${body.ownerId}` } satisfies API.ProductsSelectResponse, {
      status: 400,
    })
  }

  const result = await selectDBProducts(body)
  if (typeof result === "string") {
    return NextResponse.json({ error: result } satisfies API.ProductsSelectResponse, { status: 500 })
  }

  return NextResponse.json(result satisfies API.ProductsSelectResponse, { status: 200 })
}
```

Example helper naming:

```ts
selectDBProducts
insertDBProduct
updateDBProduct
deleteDBProduct
```