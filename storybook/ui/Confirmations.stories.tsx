import { useLayoutEffect } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, waitFor } from "storybook/test"

import { FIXTURE_IDS } from "../fixtures"
import { useAreYouSureClearCartModal } from "@/store/ui/areYouSureClearCartModal"
import { useAreYouSureDeleteProductModal } from "@/store/ui/areYouSureDeleteProductModal"
import { useAreYouSureMarkTicketAsCompletedSupportModal } from "@/store/ui/areYouSureMarkTicketAsCompletedSupportModal"
import { useGlobalImagePreview } from "@/store/ui/useGlobalImagePreview"
import { AreYouSureClearCartModal } from "@/components/ui/Modals/AreYouSureClearCartModal"
import { AreYouSureDeleteProductModal } from "@/components/ui/Modals/AreYouSureDeleteProductModal"
import { AreYouSureMarkTicketAsCompletedSupportModal } from "@/components/ui/Modals/AreYouSureMarkTicketAsCompletedSupportModal"
import { FileImagePreview, GlobalImagePreviewPortal } from "@/components/GlobalImagePreviewPortal"
import { PortalWrapper } from "@/components/PortalWrapper"

const previewFile = new File(["storybook"], "preview.png", { type: "image/png" })

function ClearCartExample() {
  useLayoutEffect(() => {
    useAreYouSureClearCartModal.setState({ isOpen: true })
  }, [])
  return <AreYouSureClearCartModal />
}

function DeleteProductExample() {
  useLayoutEffect(() => {
    useAreYouSureDeleteProductModal.getState().openModal(FIXTURE_IDS.product, "Studio headphones")
  }, [])
  return <AreYouSureDeleteProductModal />
}

function MarkTicketCompletedExample() {
  useLayoutEffect(() => {
    useAreYouSureMarkTicketAsCompletedSupportModal.setState({ isOpen: true })
  }, [])
  return <AreYouSureMarkTicketAsCompletedSupportModal />
}

function ImagePreviewExample() {
  useLayoutEffect(() => {
    useGlobalImagePreview.getState().setImage(previewFile, "user")
  }, [])
  return <GlobalImagePreviewPortal />
}

const meta = {
  title: "UI/Overlays/Confirmations",
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/en" } },
    // Report mode - these overlays ship with the dark palette and axe flags the light-theme
    // contrast of the subTitle text inside them.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const ClearCart: Story = {
  render: () => <ClearCartExample />,
}

export const DeleteProduct: Story = {
  render: () => <DeleteProductExample />,
}

export const MarkTicketCompleted: Story = {
  render: () => <MarkTicketCompletedExample />,
}

export const ImagePreview: Story = {
  render: () => <ImagePreviewExample />,
}

export const PastedImageThumbnail: Story = {
  render: () => (
    <div className="p-3">
      <FileImagePreview image={previewFile} isShowImage side="user" />
    </div>
  ),
}

export const PortalDestination: Story = {
  render: () => (
    <PortalWrapper>
      <p className="fixed bottom-4 right-4 rounded border border-border-color bg-foreground p-3 text-title">
        This paragraph is rendered through PortalWrapper into document.body.
      </p>
    </PortalWrapper>
  ),
  play: async () => {
    await waitFor(() => expect(document.body.textContent).toContain("rendered through PortalWrapper"))
  },
}
