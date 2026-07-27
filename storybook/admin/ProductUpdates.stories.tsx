import { useLayoutEffect, useRef, useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import type { TProductDB } from "@/ts/product/TProductDB"
import { createDeferred, type IDeferred } from "../mocks/deferred"
import { headphonesProduct } from "../fixtures"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { BaseInput } from "@/components/ui/Inputs/BaseInput"
import { Button } from "@/components/ui"

type UpdateFamily = "category" | "description" | "images" | "price" | "stock" | "title" | "variants"
type UpdateRequest = Record<string, unknown> & { productId: string }

interface ProductUpdateWorkbenchProps {
  family: UpdateFamily
  onUpdate: (request: UpdateRequest) => void
}

function readValue(product: TProductDB, family: UpdateFamily) {
  if (family === "title") return product.translations.en.title
  if (family === "description") return product.translations.en.description
  if (family === "price") return String(product.price)
  if (family === "category") return product.category_id ?? ""
  if (family === "stock") return String(product.on_stock)
  if (family === "images") return product.img_url.join(", ")
  return (product.variants ?? []).map(variant => variant.label).join(", ")
}

function applyValue(product: TProductDB, family: UpdateFamily, rawValue: string): TProductDB {
  if (family === "title") {
    return { ...product, translations: { ...product.translations, en: { ...product.translations.en, title: rawValue } } }
  }
  if (family === "description") {
    return { ...product, translations: { ...product.translations, en: { ...product.translations.en, description: rawValue } } }
  }
  if (family === "price") return { ...product, price: Number(rawValue) }
  if (family === "category") return { ...product, category_id: rawValue || null }
  if (family === "stock") return { ...product, on_stock: Number(rawValue) }
  if (family === "images")
    return {
      ...product,
      img_url: rawValue
        .split(",")
        .map(value => value.trim())
        .filter(Boolean),
    }
  return {
    ...product,
    variants: rawValue
      .split(",")
      .map((label, index) => ({
        id: `storybook-variant-${index + 1}`,
        image_url: product.img_url[0],
        label: label.trim(),
        price: product.price,
        quantity: product.on_stock,
      }))
      .filter(variant => variant.label),
  }
}

function getRequest(family: UpdateFamily, product: TProductDB): UpdateRequest {
  const common = { productId: product.id }
  if (family === "title") return { ...common, field: "title", value: product.translations.en.title }
  if (family === "description") return { ...common, field: "description", value: product.translations.en.description }
  if (family === "price") return { ...common, price: product.price }
  if (family === "category") return { ...common, category_id: product.category_id }
  if (family === "stock") return { ...common, onStock: product.on_stock }
  if (family === "images") return { ...common, images: product.img_url }
  return { ...common, variants: product.variants }
}

function ProductUpdateWorkbench({ family, onUpdate }: ProductUpdateWorkbenchProps) {
  const [draft, setDraft] = useState(() => readValue(headphonesProduct, family))
  const [errorMessage, setErrorMessage] = useState("")
  const [isPending, setIsPending] = useState(false)
  const requestRef = useRef<IDeferred<TProductDB> | null>(null)
  const confirmedRef = useRef<TProductDB>(headphonesProduct)
  const product = useOwnerProductsStore(state => state.products[0])

  useLayoutEffect(() => {
    confirmedRef.current = headphonesProduct
    useOwnerProductsStore.getState().hydrate([headphonesProduct])
  }, [family])

  async function handleSave() {
    if (isPending) return
    const currentProduct = useOwnerProductsStore.getState().products[0]
    const optimisticProduct = applyValue(currentProduct, family, draft.trim())
    const deferred = createDeferred<TProductDB>()
    requestRef.current = deferred
    setErrorMessage("")
    setIsPending(true)
    useOwnerProductsStore.getState().replaceProduct(currentProduct.id, optimisticProduct)
    onUpdate(getRequest(family, optimisticProduct))

    try {
      const confirmedProduct = await deferred.promise
      confirmedRef.current = confirmedProduct
      useOwnerProductsStore.getState().replaceProduct(currentProduct.id, confirmedProduct)
    } catch (error) {
      useOwnerProductsStore.getState().replaceProduct(currentProduct.id, confirmedRef.current)
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      requestRef.current = null
      setIsPending(false)
    }
  }

  function resolveRequest() {
    const currentProduct = useOwnerProductsStore.getState().products[0]
    requestRef.current?.resolve(currentProduct)
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-5 p-5 tablet:grid-cols-2">
      <section className="rounded-xl border border-border-color bg-foreground p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-subTitle">Update {family}</p>
        <h1 className="mt-2 text-xl font-semibold text-title">{product?.translations.en.title}</h1>
        <label className="mt-5 block text-sm text-subTitle" htmlFor="update-value">
          New {family}
        </label>
        <BaseInput id="update-value" value={draft} onChange={event => setDraft(event.target.value)} />
        <Button className="mt-3" disabled={isPending} loading={isPending} loadingText="Updating" onClick={handleSave}>
          Save {family}
        </Button>
        {errorMessage && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {errorMessage}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border-color bg-background p-5">
        <p className="text-xs uppercase tracking-widest text-subTitle">Visible product value</p>
        <output className="mt-3 block break-words text-lg font-semibold text-title" data-current-value>
          {product ? readValue(product, family) : ""}
        </output>
        {isPending && (
          <div className="mt-5" role="status">
            <p className="mb-3 text-sm text-info">Optimistic value visible while request is pending.</p>
            <div className="flex gap-2">
              <Button onClick={resolveRequest} size="sm" variant="success">
                Resolve update
              </Button>
              <Button onClick={() => requestRef.current?.reject(new Error(`${family} update failed`))} size="sm" variant="danger">
                Reject update
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

const meta = {
  title: "Admin/ProductUpdateWorkbench",
  component: ProductUpdateWorkbench,
  args: { family: "title", onUpdate: fn() },
} satisfies Meta<typeof ProductUpdateWorkbench>

export default meta
type Story = StoryObj<typeof meta>

async function verifyConfirmedRollback(
  canvasElement: HTMLElement,
  onUpdate: ProductUpdateWorkbenchProps["onUpdate"],
  firstValue: string,
  secondValue: string,
) {
  const canvas = within(canvasElement)
  const findByLabelTextResp = await canvas.findByLabelText(/New /)
  await userEvent.clear(findByLabelTextResp)
  await userEvent.type(findByLabelTextResp, firstValue)
  await userEvent.click(canvas.getByRole("button", { name: /Save / }))
  await expect(canvas.getByText(/Optimistic value visible/)).toBeVisible()
  await expect(canvasElement.querySelector("[data-current-value]")).toHaveTextContent(firstValue)
  await expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ productId: headphonesProduct.id }))
  await userEvent.click(canvas.getByRole("button", { name: "Resolve update" }))
  await waitFor(() => expect(canvas.queryByText(/Optimistic value visible/)).not.toBeInTheDocument())

  await userEvent.clear(findByLabelTextResp)
  await userEvent.type(findByLabelTextResp, secondValue)
  await userEvent.click(canvas.getByRole("button", { name: /Save / }))
  await expect(canvasElement.querySelector("[data-current-value]")).toHaveTextContent(secondValue)
  await userEvent.click(canvas.getByRole("button", { name: "Reject update" }))
  await waitFor(() => expect(canvasElement.querySelector("[data-current-value]")).toHaveTextContent(firstValue))
  await expect(await canvas.findByRole("alert")).toHaveTextContent("update failed")
}

export const Title: Story = {
  play: ({ args, canvasElement }) => verifyConfirmedRollback(canvasElement, args.onUpdate, "Confirmed title", "Rejected title"),
}
export const Description: Story = {
  args: { family: "description" },
  play: ({ args, canvasElement }) =>
    verifyConfirmedRollback(canvasElement, args.onUpdate, "Confirmed description", "Rejected description"),
}
export const Price: Story = {
  args: { family: "price" },
  play: ({ args, canvasElement }) => verifyConfirmedRollback(canvasElement, args.onUpdate, "219.95", "500"),
}
export const Category: Story = {
  args: { family: "category" },
  play: ({ args, canvasElement }) =>
    verifyConfirmedRollback(canvasElement, args.onUpdate, "category-confirmed", "category-rejected"),
}
export const Stock: Story = {
  args: { family: "stock" },
  play: ({ args, canvasElement }) => verifyConfirmedRollback(canvasElement, args.onUpdate, "42", "0"),
}
export const Images: Story = {
  args: { family: "images" },
  play: ({ args, canvasElement }) =>
    verifyConfirmedRollback(canvasElement, args.onUpdate, "/confirmed-image.png", "/rejected-image.png"),
}
export const Variants: Story = {
  args: { family: "variants" },
  play: ({ args, canvasElement }) => verifyConfirmedRollback(canvasElement, args.onUpdate, "Confirmed black", "Rejected silver"),
}
