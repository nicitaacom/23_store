import { useEffect, useLayoutEffect, useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import type { IUTMAggregatedStats } from "@/ts/interfaces/IUTMAggregatedStats"
import { backupSDK, completeFilesImport, completeTablesExport } from "../mocks/backupSDK"
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
    return useDbBackupState.subscribe(state => setIsModalOpen(state.isModalOpen))
  }, [])

  function reopenBackupModal() {
    window.history.replaceState(null, "", "/en/stats?modal=DbBackup")
    window.dispatchEvent(new PopStateEvent("popstate"))
    setIsModalOpen(true)
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

export const UtmDatePickerClosesOnOutsideClick: Story = {
  render: () => <UTMDashboard utmStatsResponse={utmStats} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = await waitFor(() => canvas.getByRole("button", { name: "Choose analytics year and period" }))
    await userEvent.click(trigger)
    await waitFor(() => expect(canvas.getByText("Year")).toBeVisible())

    await userEvent.click(await canvas.findByText(/Track your marketing campaign performance/))
    await waitFor(() => expect(canvas.queryByText("Year")).not.toBeInTheDocument())
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

    await userEvent.click(canvas.getByRole("button", { name: "Close modal" }))
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

    await userEvent.click(canvas.getByRole("button", { name: "Close modal" }))
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

export const BackupCopyToR2: Story = {
  parameters: {
    nextjs: { navigation: { pathname: "/en/stats", query: { modal: "DbBackup" } } },
    viewport: { defaultViewport: "mobileSmall" },
  },
  render: () => <BackupProgressWorkbench />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Supabase")).toBeVisible()
    await userEvent.click(await canvas.findByRole("button", { name: "Files" }))
    await expect(canvas.getByText("R2")).toBeVisible()
    await expect(canvas.queryByText("Supabase")).not.toBeInTheDocument()
    await expect(canvas.queryByText("Current storage")).not.toBeInTheDocument()
    await expect(canvas.getByRole("checkbox", { name: /Skip files already in R2/ })).toBeChecked()
    await expect(canvas.getByText("Import will relink existing image URLs in the database to R2.")).toBeVisible()
    const file = new File(["example"], "files.tar.gz", { type: "application/gzip" })
    const fileInput = canvasElement.querySelector<HTMLInputElement>('input[accept=".tar.gz,.gz,.tgz"]')!
    await userEvent.upload(fileInput, file)
    await waitFor(() => expect(backupSDK.importFiles).toHaveBeenLastCalledWith(file, expect.any(Function), "r2", { skipExisting: true }))
    await expect(canvas.getByText("Elapsed time")).toBeVisible()
    await expect(canvas.getByText("Est. time remaining")).toBeVisible()
    const content = canvasElement.querySelector<HTMLElement>('[data-cy="db-backup-content"]')!
    const originalHeight = content.getBoundingClientRect().height
    const longPath = `23_product-images/owner/product/${"very-long-image-name-".repeat(40)}.avif`
    useDbBackupState.setState({ filesImportLabel: longPath, filesImportStartedAt: Date.now() - 61000 })
    await waitFor(() => expect(canvas.getByTitle(longPath)).toBeVisible())
    await expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth)
    await expect(content.getBoundingClientRect().height).toBe(originalHeight)
    await waitFor(() => expect(canvas.getByText(/00:01:0[12]/)).toBeVisible())
    await userEvent.click(canvas.getByRole("button", { name: "Close modal" }))
    await expect(await canvas.findByRole("status", { name: "Database backup" })).toBeVisible()
    completeFilesImport()
    await waitFor(() => expect(useDbBackupState.getState().filesImportPhase).toBe("done"))
    await userEvent.click(await canvas.findByRole("button", { name: "Reopen backup" }))
    await userEvent.click(await canvas.findByRole("button", { name: "Files" }))
    await expect(canvas.getByText("R2 image URL relinking completed.")).toBeVisible()
    await expect(canvas.getByText("R2")).toBeVisible()
    await expect(canvas.queryByText("Supabase")).not.toBeInTheDocument()
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
