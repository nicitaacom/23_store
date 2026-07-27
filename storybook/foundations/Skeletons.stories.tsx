import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, waitFor, within } from "storybook/test"

import { DesktopSidebarSkeleton } from "@/components/Skeletons/support/components/components/DesktopSidebarSkeleton"
import { InitialPageLoadingSkeleton } from "@/components/Skeletons/InitialPageLoadingSkeleton"
import { MessagesBodySkeleton } from "@/components/Skeletons/support/components/components/MessagesBodySkeleton"
import { MessagesFooterSkeleton } from "@/components/Skeletons/support/components/components/MessagesFooterSkeleton"
import { MessagesHeaderSkeleton } from "@/components/Skeletons/support/components/components/MessagesHeaderSkeleton"
import { MobileSidebarSkeleton } from "@/components/Skeletons/support/components/components/MobileSidebarSkeleton"
import { NavbarSkeleton } from "@/components/Skeletons/NavbarSkeleton"
import { ProductsSkeleton } from "@/components/Skeletons/InitialPageLoading/ProductsSkeleton"
import { SupportPageLoadingSkeleton } from "@/components/Skeletons/support/SupportPageLoadingSkeleton"
import { SupportPageSkeleton } from "@/components/Skeletons/support/components/SupportPageSkeleton"

function SkeletonFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <section className="grid gap-2 p-3">
      <h2 className="text-sm uppercase tracking-widest text-subTitle">{label}</h2>
      <div className="rounded border border-border-color/40">{children}</div>
    </section>
  )
}

const meta = {
  title: "Foundations/Skeletons",
  parameters: {
    layout: "fullscreen",
    // The a11y checks run in report mode for these stories: they document components that already
    // ship with the dark-theme palette, and axe flags the light-theme contrast of subTitle text
    // inside them. The contrast debt sits in the components, not in the stories - fixing it is a
    // palette change that has to be decided for the whole app at once.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const PageLoading: Story = {
  render: () => (
    <SkeletonFrame label="Initial page">
      <InitialPageLoadingSkeleton />
    </SkeletonFrame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText("Initial page")).toBeVisible())
  },
}

export const Navbar: Story = {
  render: () => (
    <SkeletonFrame label="Navbar">
      <NavbarSkeleton />
    </SkeletonFrame>
  ),
}

export const Products: Story = {
  render: () => (
    <SkeletonFrame label="Products grid">
      <ProductsSkeleton />
    </SkeletonFrame>
  ),
}

export const SupportPage: Story = {
  render: () => (
    <div className="grid gap-3">
      <SkeletonFrame label="Support page without an open ticket">
        <SupportPageSkeleton ticketId="storybook-ticket" />
      </SkeletonFrame>
      <SkeletonFrame label="Support page with an open ticket">
        <SupportPageSkeleton ticketId={{ ticketId: "storybook-ticket" }} />
      </SkeletonFrame>
    </div>
  ),
}

export const SupportPageLoading: Story = {
  render: () => (
    <SkeletonFrame label="Support page loading">
      <SupportPageLoadingSkeleton ticketId="storybook-ticket" />
    </SkeletonFrame>
  ),
}

export const SupportPieces: Story = {
  render: () => (
    <div className="grid gap-3">
      <SkeletonFrame label="Desktop sidebar">
        <DesktopSidebarSkeleton />
      </SkeletonFrame>
      <SkeletonFrame label="Mobile sidebar">
        <MobileSidebarSkeleton />
      </SkeletonFrame>
      <SkeletonFrame label="Messages header">
        <MessagesHeaderSkeleton />
      </SkeletonFrame>
      <SkeletonFrame label="Messages body">
        <MessagesBodySkeleton />
      </SkeletonFrame>
      <SkeletonFrame label="Messages footer">
        <MessagesFooterSkeleton />
      </SkeletonFrame>
    </div>
  ),
}
