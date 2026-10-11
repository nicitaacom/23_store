import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"

import { r2Config } from "@/config/r2Config"
import { StorageUsage } from "@/components/ui/Modals/AdminPanel/components/StorageUsage"
import type { TStorageUsage } from "@/ts/storage"

function observation(bytes: number, status: "available" | "stale" = "available"): TStorageUsage {
  const allowance = r2Config.totalForAllUsersGB * 1000 ** 3
  return { provider: "r2", refreshedAt: "2026-10-11T12:00:00Z", metrics: {
    applicationLimit: { value: bytes, unit: "bytes", source: "Provider object inventory and reserved uploads",
      scope: "Public application R2 bucket, including temporary uploads", observedAt: "2026-10-11T12:00:00Z", status,
      allowance, remaining: Math.max(0, allowance - bytes), excess: Math.max(0, bytes - allowance) },
    supabaseDatabase: { value: 0.5 * 1000 ** 3, unit: "bytes", source: "Supabase restricted SQL function",
      scope: "Whole shared database, including other projects", observedAt: "2026-10-11T12:00:00Z", status: "available" },
    supabaseFiles: { value: null, unit: "bytes", source: "Supabase Storage metadata", scope: "Legacy application files",
      observedAt: null, status: "unavailable", detail: "Provider observation is unavailable" },
  } }
}
const meta = {
  title: "Admin/Storage usage", component: StorageUsage,
  args: { roles: ["ADMIN"], initialUsage: observation(0) },
  parameters: { layout: "padded" },
} satisfies Meta<typeof StorageUsage>
export default meta
type Story = StoryObj<typeof meta>

export const Available: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("heading", { name: "Storage & usage" })).toBeVisible()
    await expect(canvas.getByText("0 GB", { exact: true })).toBeVisible()
    await expect(canvas.getByText("Unavailable", { exact: true })).toBeVisible()
  },
}
export const WarningAtEightGB: Story = { args: { initialUsage: observation(8 * 1000 ** 3) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("status")).toHaveTextContent("At least 80% of upload capacity used")
    await expect(canvas.getByText("8 GB", { exact: true })).toBeVisible()
  },
}
export const LimitReached: Story = { args: { initialUsage: observation(10 * 1000 ** 3) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent("Upload limit reached; additional uploads are blocked")
  },
}
export const Stale: Story = { args: { initialUsage: observation(8 * 1000 ** 3, "stale") } }
export const NonAdmin: Story = { args: { roles: ["USER"] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("heading", { name: "Storage & usage" })).not.toBeInTheDocument()
  },
}
export const Mobile: Story = { args: { initialUsage: observation(8 * 1000 ** 3) },
  parameters: { viewport: { defaultViewport: "mobileSmall" } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(320)
  },
}
