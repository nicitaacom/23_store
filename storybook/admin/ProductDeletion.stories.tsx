import { useLayoutEffect, useRef, useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import type { TProductDB } from "@/ts/product/TProductDB"
import { createDeferred, type IDeferred } from "../mocks/deferred"
import { headphonesProduct } from "../fixtures"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { Button } from "@/components/ui"

interface ProductDeletionWorkbenchProps {
  authorized: boolean
  onDelete: (request: { id: string }) => void
}

function ProductDeletionWorkbench({ authorized, onDelete }: ProductDeletionWorkbenchProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isPending, setIsPending] = useState(false)
  const requestRef = useRef<IDeferred<void> | null>(null)
  const snapshotRef = useRef<TProductDB | null>(null)
  const products = useOwnerProductsStore(state => state.products)

  useLayoutEffect(() => useOwnerProductsStore.getState().hydrate([headphonesProduct]), [])

  async function deleteProduct() {
    if (isPending) return
    const product = useOwnerProductsStore.getState().products.find(currentProduct => currentProduct.id === headphonesProduct.id)
    if (!product || !authorized) return

    const deferred = createDeferred<void>()
    requestRef.current = deferred
    snapshotRef.current = product
    setConfirmOpen(false)
    setErrorMessage("")
    setIsPending(true)
    useOwnerProductsStore.getState().removeProduct(product.id)
    onDelete({ id: product.id })

    try {
      await deferred.promise
    } catch (error) {
      if (snapshotRef.current) useOwnerProductsStore.getState().addProduct(snapshotRef.current)
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      requestRef.current = null
      snapshotRef.current = null
      setIsPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-5">
      <section className="rounded-xl border border-border-color bg-foreground p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-subTitle">Owner product</p>
            <h1 className="mt-1 text-xl font-semibold text-title">{headphonesProduct.translations.en.title}</h1>
          </div>
          {authorized && products.length > 0 && (
            <Button onClick={() => setConfirmOpen(true)} variant="danger">
              Delete product
            </Button>
          )}
        </div>

        {!authorized && (
          <p className="mt-4 rounded border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            Delete controls are hidden for unauthorized users.
          </p>
        )}
        {products.length === 0 && !isPending && <p className="mt-4 text-success">Product deleted.</p>}
        {isPending && (
          <div className="mt-4 flex items-center gap-3" role="status">
            <Button disabled loading loadingText="Deleting product" variant="danger" />
            <Button onClick={() => requestRef.current?.resolve()} size="sm" variant="success">
              Resolve deletion
            </Button>
            <Button
              onClick={() => requestRef.current?.reject(new Error("Delete request failed"))}
              size="sm"
              variant="danger-outline">
              Reject deletion
            </Button>
          </div>
        )}
        {errorMessage && (
          <p className="mt-4 text-danger" role="alert">
            {errorMessage}
          </p>
        )}
      </section>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title">
          <div className="w-full max-w-md rounded-xl border border-border-color bg-modal-surface p-5 shadow-compact-lg">
            <h2 className="text-xl font-semibold text-title" id="delete-title">
              Delete this product?
            </h2>
            <p className="mt-2 text-sm text-subTitle">The product is removed optimistically and restored if the request fails.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setConfirmOpen(false)} variant="default-outline">
                Cancel
              </Button>
              <Button onClick={() => void deleteProduct()} variant="danger">
                Confirm deletion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const meta = {
  title: "Admin/ProductDeletionWorkbench",
  component: ProductDeletionWorkbench,
  args: { authorized: true, onDelete: fn() },
} satisfies Meta<typeof ProductDeletionWorkbench>

export default meta
type Story = StoryObj<typeof meta>

async function openConfirmation(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  await userEvent.click(await canvas.findByRole("button", { name: "Delete product" }))
  await expect(await canvas.findByRole("dialog", { name: "Delete this product?" })).toBeVisible()
  return canvas
}

export const Confirmation: Story = { play: async ({ canvasElement }) => { await openConfirmation(canvasElement) } }

export const Cancel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await openConfirmation(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }))
    await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Delete product" })).toBeVisible()
  },
}

export const PendingAndOptimisticRemoval: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = await openConfirmation(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Confirm deletion" }))
    await expect(await canvas.findByRole("status")).toHaveTextContent("Deleting product")
    await expect(canvas.queryByRole("button", { name: "Delete product" })).not.toBeInTheDocument()
    await expect(args.onDelete).toHaveBeenCalledWith({ id: headphonesProduct.id })
  },
}

export const SuccessfulDeletion: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await openConfirmation(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Confirm deletion" }))
    await userEvent.click(await canvas.findByRole("button", { name: "Resolve deletion" }))
    await waitFor(() => expect(canvas.queryByRole("status")).not.toBeInTheDocument())
    await expect(canvas.getByText("Product deleted.")).toBeVisible()
  },
}

export const FailedDeletionRecovery: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await openConfirmation(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Confirm deletion" }))
    await userEvent.click(await canvas.findByRole("button", { name: "Reject deletion" }))
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Delete request failed")
    await expect(canvas.getByRole("button", { name: "Delete product" })).toBeVisible()
  },
}

export const UnauthorizedControls: Story = {
  args: { authorized: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText(/hidden for unauthorized users/i)).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Delete product" })).not.toBeInTheDocument()
  },
}

export const DuplicateDeletionPrevention: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = await openConfirmation(canvasElement)
    const confirmButton = canvas.getByRole("button", { name: "Confirm deletion" })
    await userEvent.dblClick(confirmButton)
    await expect(args.onDelete).toHaveBeenCalledOnce()
    await expect(await canvas.findByRole("button", { name: "Deleting product" })).toBeDisabled()
  },
}
