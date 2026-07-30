import { useEffect, useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import type { IUTMAggregatedStats } from "@/ts/interfaces/IUTMAggregatedStats"
import { completeTablesExport } from "../mocks/backupSDK"
import { DbBackupModal } from "@/components/ui/Modals/DbBackup/DbBackupModal"
import { DbBackupProvider } from "@/components/ui/Modals/DbBackup/DbBackupProvider"
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

function BackupProgressWorkbench() {
  const [isModalOpen, setIsModalOpen] = useState(true)

  useEffect(() => {
    function syncBackupModalVisibility() {
      setIsModalOpen(new URLSearchParams(window.location.search).getAll("modal").includes("DbBackup"))
    }

    window.addEventListener("popstate", syncBackupModalVisibility)
    return () => window.removeEventListener("popstate", syncBackupModalVisibility)
  }, [])

  function reopenBackupModal() {
    window.history.replaceState(null, "", "/en/stats?modal=DbBackup")
    window.dispatchEvent(new PopStateEvent("popstate"))
  }

  return (
    <DbBackupProvider isModalOpen={isModalOpen}>
      {!isModalOpen && (
        <button className="m-3 rounded border border-success/30 px-3 py-2 text-success" type="button" onClick={reopenBackupModal}>
          Reopen backup
        </button>
      )}
      {isModalOpen && <DbBackupModal />}
    </DbBackupProvider>
  )
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
  parameters: { nextjs: { navigation: { pathname: "/en/stats", query: { modal: "DbBackup" } } } },
  render: () => <BackupProgressWorkbench />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await waitFor(() => canvas.getByRole("button", { name: "Export" })))
    await waitFor(() => expect(canvas.getByRole("button", { name: "Export" })).toBeDisabled())

    await waitFor(() => {
      const pageCloseEvent = new Event("beforeunload", { cancelable: true })
      expect(window.dispatchEvent(pageCloseEvent)).toBe(false)
    })

    const firstCloseButton = canvasElement.querySelector("svg.absolute.right-3")
    await expect(firstCloseButton).not.toBeNull()
    await userEvent.click(firstCloseButton as Element)
    const backupStatus = await waitFor(() => canvas.getByRole("status", { name: "Database backup" }))
    await expect(backupStatus).toBeVisible()
    await expect(backupStatus).toHaveTextContent("Tables · Export")
    await expect(backupStatus).toHaveTextContent("25%")

    await userEvent.click(canvas.getByRole("button", { name: "Reopen backup" }))
    await waitFor(() => expect(canvas.getByRole("button", { name: "Export" })).toBeDisabled())
    await expect(canvas.queryByRole("status", { name: "Database backup" })).not.toBeInTheDocument()

    const secondCloseButton = canvasElement.querySelector("svg.absolute.right-3")
    await expect(secondCloseButton).not.toBeNull()
    await userEvent.click(secondCloseButton as Element)
    await waitFor(() => expect(canvas.getByRole("status", { name: "Database backup" })).toBeVisible())

    completeTablesExport()
    await waitFor(() => expect(canvas.queryByRole("status", { name: "Database backup" })).not.toBeInTheDocument())
    await waitFor(() => {
      const completedPageCloseEvent = new Event("beforeunload", { cancelable: true })
      expect(window.dispatchEvent(completedPageCloseEvent)).toBe(true)
    })
  },
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
