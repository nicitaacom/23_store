import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, waitFor, within } from "storybook/test"

import type { IUTMAggregatedStats } from "@/ts/interfaces/IUTMAggregatedStats"
import { DbBackupModal } from "@/components/ui/Modals/DbBackup/DbBackupModal"
import { MemoryDebug } from "@/[locale]/(site)/components/MemoryDebug"
import { UTMDashboard } from "@/[locale]/(site)/stats/components/UTMDashboard"

const utmStats: IUTMAggregatedStats = {
  totalVisits: 1280,
  uniqueUsers: 840,
  sourceStats: [
    { name: "23_store", count: 520 },
    { name: "instagram", count: 410 },
    { name: "organic", count: 350 },
  ],
  mediumStats: [
    { name: "hamburger_menu", count: 610 },
    { name: "story", count: 340 },
  ],
  campaignStats: [
    { name: "ecosystem", count: 700 },
    { name: "spring", count: 260 },
  ],
  countryStats: [
    { name: "Finland", code: "FI", count: 720 },
    { name: "Sweden", code: "SE", count: 300 },
  ],
  locationStats: [
    { name: "Helsinki", country: "Finland", countryCode: "FI", region: "Uusimaa", city: "Helsinki", count: 420 },
    { name: "Stockholm", country: "Sweden", countryCode: "SE", region: "Stockholm", city: "Stockholm", count: 180 },
  ],
  recentVisits: 96,
  rawStats: [],
  chartData: [
    { date: "2026-02-10", visits: 120 },
    { date: "2026-02-11", visits: 180 },
    { date: "2026-02-12", visits: 240 },
    { date: "2026-02-13", visits: 300 },
    { date: "2026-02-14", visits: 440 },
  ],
}

const meta = {
  title: "Admin/AdminTools",
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/en/stats" } },
    // Report mode - the admin surfaces ship with the dark palette and axe flags the light-theme
    // contrast of their subTitle text.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const UtmStats: Story = {
  render: () => <UTMDashboard utmStatsResponse={utmStats} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText(/1[\s,.]?280/)).toBeVisible())
  },
}

export const Backup: Story = {
  render: () => <DbBackupModal />,
}

export const SalesAssistantMemory: Story = {
  render: () => (
    <div className="max-w-2xl p-3">
      <MemoryDebug
        debugContext={null}
        memory="Customer asked for over-ear headphones under 200 EUR and shipping to Helsinki."
      />
    </div>
  ),
}
