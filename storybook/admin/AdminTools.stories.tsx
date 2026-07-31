import { useEffect, useLayoutEffect, useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import type { IUTMAggregatedStats } from "@/ts/interfaces/IUTMAggregatedStats"
import { completeTablesExport } from "../mocks/backupSDK"
import { useDbBackupState } from "@/store/ui/useDbBackupState"
import { DbBackupModal } from "@/components/ui/Modals/DbBackup/DbBackupModal"
import { DbBackupProgressCard } from "@/components/ui/Modals/DbBackup/DbBackupProgressCard"
import { MemoryDebug } from "@/[locale]/(site)/components/MemoryDebug"
import SupportButton from "@/components/SupportButton/SupportButton"
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
    <>
      {!isModalOpen && (
        <button className="m-3 rounded border border-success/30 px-3 py-2 text-success" type="button" onClick={reopenBackupModal}>
          Reopen backup
        </button>
      )}
      {isModalOpen && <DbBackupModal />}
      <DbBackupProgressCard />
      <SupportButton />
    </>
  )
}

function BackupProgressPlacementWorkbench() {
  useLayoutEffect(() => {
    useDbBackupState.setState({
      isModalOpen: false,
      tablesExportPhase: "exporting",
      tablesExportProgress: 0.42,
    })
    return () => useDbBackupState.getState().reset()
  }, [])

  return (
    <div className="min-h-screen bg-background p-4 text-subTitle">
      <p>Backup progress and support remain independently accessible.</p>
      <DbBackupProgressCard />
      <SupportButton />
    </div>
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
  parameters: {
    nextjs: { navigation: { pathname: "/en/stats", query: { modal: "DbBackup" } } },
    viewport: { defaultViewport: "mobileSmall" },
  },
  render: () => <BackupProgressWorkbench />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await waitFor(() => canvas.getByRole("button", { name: "Export" })))
    await waitFor(() => expect(canvas.getByRole("button", { name: "Export" })).toBeDisabled())
    await expect(canvas.queryByRole("status", { name: "Database backup" })).not.toBeInTheDocument()

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
    const supportButton = canvas.getByRole("button", { name: "Open support chat" })
    const backupStatusBounds = backupStatus.getBoundingClientRect()
    const supportButtonBounds = supportButton.getBoundingClientRect()
    await expect(backupStatusBounds.left).toBeGreaterThanOrEqual(16)
    await expect(backupStatusBounds.width).toBeLessThanOrEqual(420)
    await expect(backupStatusBounds.right).toBeLessThan(supportButtonBounds.left)
    await expect(Math.abs(backupStatusBounds.bottom - supportButtonBounds.bottom)).toBeLessThanOrEqual(1)
    await userEvent.click(supportButton)
    await waitFor(() => expect(supportButton).toHaveAttribute("aria-expanded", "true"))
    await expect(Number(getComputedStyle(backupStatus).zIndex)).toBeLessThan(
      Number(getComputedStyle(supportButton.parentElement as HTMLElement).zIndex),
    )
    await userEvent.click(supportButton)
    await waitFor(() => expect(supportButton).toHaveAttribute("aria-expanded", "false"))

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

export const BackupProgressPlacement: Story = {
  parameters: { viewport: { defaultViewport: "mobileSmall" } },
  render: () => <BackupProgressPlacementWorkbench />,
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
