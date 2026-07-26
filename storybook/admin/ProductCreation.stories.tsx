import { useLayoutEffect, useRef, useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import type { TProductDB } from "@/ts/product/TProductDB"
import { createDeferred, type IDeferred } from "../mocks/deferred"
import { headphonesProduct } from "../fixtures"
import { createRawProductTranslations } from "@/utils/product"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { BaseInput } from "@/components/ui/Inputs/BaseInput"
import { Button } from "@/components/ui"

interface CreateRequest {
  category_id: string | null
  description: string
  images: string[]
  onStock: number
  price: number
  title: string
  variants: { label: string; price: number; quantity: number }[]
}

interface ProductCreationWorkbenchProps {
  initialState: "empty" | "valid"
  onCreate: (request: CreateRequest) => void
}

function createProduct(request: CreateRequest, id: string): TProductDB {
  return {
    ...headphonesProduct,
    id,
    category_id: request.category_id,
    img_url: request.images,
    on_stock: request.onStock,
    price: request.price,
    price_id: id,
    translations: createRawProductTranslations(request.title, request.description),
    variants: request.variants.map((variant, index) => ({
      ...variant,
      id: `variant-${index + 1}`,
      image_url: request.images[0],
    })),
  }
}

function ProductCreationWorkbench({ initialState, onCreate }: ProductCreationWorkbenchProps) {
  const valid = initialState === "valid"
  const [title, setTitle] = useState(valid ? "Storybook keyboard" : "")
  const [description, setDescription] = useState(valid ? "A deterministic product created in Storybook." : "")
  const [price, setPrice] = useState(valid ? "129.99" : "")
  const [category, setCategory] = useState(valid ? "category-featured" : "")
  const [stock, setStock] = useState(valid ? "6" : "")
  const [image, setImage] = useState(valid ? "/products/keyboard.png" : "")
  const [variant, setVariant] = useState(valid ? "Black" : "")
  const [errorMessage, setErrorMessage] = useState("")
  const [isPending, setIsPending] = useState(false)
  const requestRef = useRef<IDeferred<TProductDB> | null>(null)
  const products = useOwnerProductsStore(state => state.products)

  useLayoutEffect(() => useOwnerProductsStore.getState().hydrate([]), [])

  async function handleCreate() {
    if (isPending) return
    const parsedPrice = Number(price)
    const parsedStock = Number(stock)
    if (!title.trim() || !description.trim() || !(parsedPrice > 0) || !image.trim() || !variant.trim()) {
      setErrorMessage("Complete title, description, price, image, and variant before creating the product.")
      return
    }

    const request: CreateRequest = {
      category_id: category || null,
      description: description.trim(),
      images: [image.trim()],
      onStock: parsedStock > 0 ? parsedStock : 0,
      price: parsedPrice,
      title: title.trim(),
      variants: [{ label: variant.trim(), price: parsedPrice, quantity: parsedStock > 0 ? parsedStock : 0 }],
    }
    const optimisticId = "optimistic-storybook-product"
    const deferred = createDeferred<TProductDB>()
    requestRef.current = deferred
    setErrorMessage("")
    setIsPending(true)
    useOwnerProductsStore.getState().addProduct(createProduct(request, optimisticId))
    onCreate(request)

    try {
      const confirmedProduct = await deferred.promise
      useOwnerProductsStore.getState().replaceProduct(optimisticId, confirmedProduct)
    } catch (error) {
      useOwnerProductsStore.getState().removeProduct(optimisticId)
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      requestRef.current = null
      setIsPending(false)
    }
  }

  function resolveRequest() {
    const request = requestRef.current
    const optimisticProduct = useOwnerProductsStore.getState().products.find(product => product.id.startsWith("optimistic-"))
    if (request && optimisticProduct)
      request.resolve({ ...optimisticProduct, id: "server-product-23", price_id: "price-server-23" })
  }

  return (
    <div className="grid gap-5 p-5 laptop:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <form
        className="grid gap-3 rounded-xl border border-border-color bg-foreground p-5"
        onSubmit={event => {
          event.preventDefault()
          void handleCreate()
        }}>
        <h1 className="text-xl font-semibold text-title">Create product</h1>
        <BaseInput aria-label="Title" placeholder="Title" value={title} onChange={event => setTitle(event.target.value)} />
        <BaseInput
          aria-label="Description"
          placeholder="Description"
          value={description}
          onChange={event => setDescription(event.target.value)}
        />
        <BaseInput
          aria-label="Price"
          inputMode="decimal"
          placeholder="Price"
          value={price}
          onChange={event => setPrice(event.target.value)}
        />
        <BaseInput
          aria-label="Category"
          placeholder="Category"
          value={category}
          onChange={event => setCategory(event.target.value)}
        />
        <BaseInput
          aria-label="Stock"
          inputMode="numeric"
          placeholder="Stock"
          value={stock}
          onChange={event => setStock(event.target.value)}
        />
        <BaseInput
          aria-label="Image URL"
          placeholder="Image URL"
          value={image}
          onChange={event => setImage(event.target.value)}
        />
        <BaseInput
          aria-label="Variant"
          placeholder="Variant"
          value={variant}
          onChange={event => setVariant(event.target.value)}
        />
        <Button disabled={isPending} loading={isPending} loadingText="Creating" type="submit">
          Create product
        </Button>
        {errorMessage && (
          <p className="text-sm text-danger" role="alert">
            {errorMessage}
          </p>
        )}
      </form>

      <section className="rounded-xl border border-border-color bg-background p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-title">Owner products</h2>
          {isPending && (
            <span className="rounded bg-info/10 px-2 py-1 text-xs text-info" role="status">
              Translation pending
            </span>
          )}
        </div>
        {products.length === 0 ? (
          <p className="text-subTitle">No products yet.</p>
        ) : (
          <ul className="grid gap-2">
            {products.map(product => (
              <li className="rounded border border-border-color bg-foreground p-3" data-product-id={product.id} key={product.id}>
                <strong>{product.translations.en.title}</strong>
                <span className="ml-2 text-xs text-subTitle">{product.id}</span>
              </li>
            ))}
          </ul>
        )}
        {isPending && (
          <div className="mt-4 flex gap-2">
            <Button onClick={resolveRequest} size="sm" variant="success">
              Resolve request
            </Button>
            <Button onClick={() => requestRef.current?.reject(new Error("Create request failed"))} size="sm" variant="danger">
              Reject request
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

const meta = {
  title: "Admin/ProductCreationWorkbench",
  component: ProductCreationWorkbench,
  args: { initialState: "empty", onCreate: fn() },
} satisfies Meta<typeof ProductCreationWorkbench>

export default meta
type Story = StoryObj<typeof meta>

export const EmptyForm: Story = {}
export const ValidForm: Story = { args: { initialState: "valid" } }

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Create product" }))
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Complete title")
  },
}

export const InsertingState: Story = {
  args: { initialState: "valid" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Create product" }))
    await expect(await canvas.findByRole("status")).toHaveTextContent("pending")
    await expect(canvas.getByRole("button", { name: "Creating" })).toBeDisabled()
  },
}

export const OptimisticThenConfirmed: Story = {
  args: { initialState: "valid" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Create product" }))
    await expect(canvasElement.querySelector('[data-product-id="optimistic-storybook-product"]')).toBeInTheDocument()
    await expect(args.onCreate).toHaveBeenCalledWith(expect.objectContaining({ title: "Storybook keyboard", price: 129.99 }))
    await userEvent.click(canvas.getByRole("button", { name: "Resolve request" }))
    await waitFor(() => expect(canvasElement.querySelector('[data-product-id="server-product-23"]')).toBeInTheDocument())
    await expect(canvasElement.querySelector('[data-product-id="optimistic-storybook-product"]')).not.toBeInTheDocument()
  },
}

export const FailedRollback: Story = {
  args: { initialState: "valid" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Create product" }))
    await expect(canvasElement.querySelector('[data-product-id="optimistic-storybook-product"]')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Reject request" }))
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-product-id="optimistic-storybook-product"]')).not.toBeInTheDocument(),
    )
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Create request failed")
  },
}

export const DuplicateSubmissionPrevention: Story = {
  args: { initialState: "valid" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const findByRoleResp = await canvas.findByRole("button", { name: "Create product" })
    await userEvent.dblClick(findByRoleResp)
    await expect(args.onCreate).toHaveBeenCalledOnce()
    await expect(canvas.getByRole("button", { name: "Creating" })).toBeDisabled()
  },
}
