import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, waitFor, within } from "storybook/test"

import type { TPrintArea } from "@/ts/product/TPersonalization"
import { computePrintMetrics, formatPrintSize, getAspectDrift, getRequiredPixels } from "@/utils/printMetrics"

const mousepad: TPrintArea = { widthMm: 900, heightMm: 400, minDpi: 150 }
const poster: TPrintArea = { widthMm: 300, heightMm: 400, minDpi: 150 }

const cases = [
  { label: "Mousepad · 6000x3000 upload", printArea: mousepad, sourceWidthPx: 6000, sourceHeightPx: 3000, scale: 1 },
  { label: "Mousepad · 6000x3000, zoomed 2x", printArea: mousepad, sourceWidthPx: 6000, sourceHeightPx: 3000, scale: 2 },
  { label: "Mousepad · 1200x800 phone shot", printArea: mousepad, sourceWidthPx: 1200, sourceHeightPx: 800, scale: 1 },
  { label: "Poster · 4000x5000 upload", printArea: poster, sourceWidthPx: 4000, sourceHeightPx: 5000, scale: 1 },
]

// http://localhost:6006/?path=/story/ui-inputs-printmetrics--dpi-table
function PrintMetricsTable() {
  return (
    <div className="grid gap-3 p-4 text-title">
      <p className="text-sm text-subTitle">
        Effective DPI is measured on the part of the upload that actually reaches the print area, so zooming in lowers it.
      </p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-subTitle">
            <th className="py-1">Case</th>
            <th className="py-1">Print size</th>
            <th className="py-1">Needs (150 DPI)</th>
            <th className="py-1">Effective DPI</th>
            <th className="py-1">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {cases.map(printCase => {
            const metrics = computePrintMetrics({
              printArea: printCase.printArea,
              sourceWidthPx: printCase.sourceWidthPx,
              sourceHeightPx: printCase.sourceHeightPx,
              placement: { scale: printCase.scale, offsetXPct: 0, offsetYPct: 0 },
            })
            const required = getRequiredPixels(printCase.printArea, printCase.printArea.minDpi ?? 150)

            return (
              <tr className="border-t border-border-color/30" key={printCase.label}>
                <td className="py-1.5">{printCase.label}</td>
                <td className="py-1.5">{formatPrintSize(printCase.printArea)}</td>
                <td className="py-1.5">
                  {required.width} x {required.height} px
                </td>
                <td className="py-1.5" data-cy={`dpi-${printCase.label}`}>
                  {metrics.effectiveDpi}
                </td>
                <td className="py-1.5">{metrics.quality}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const meta = {
  title: "UI/Inputs/PrintMetrics",
  parameters: {
    // Report mode - the table uses the app's subTitle token, which axe reads as low contrast on the
    // light Storybook background.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// The math is the feature, so the numbers are asserted here instead of only being rendered.
export const DpiTable: Story = {
  render: () => <PrintMetricsTable />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText("Mousepad · 6000x3000 upload")).toBeVisible())

    // 900 mm = 35.43 in; a 6000 px wide crop over it is 169 DPI
    const sharp = computePrintMetrics({ printArea: mousepad, sourceWidthPx: 6000, sourceHeightPx: 3000 })
    await expect(sharp.effectiveDpi).toBe(169)
    await expect(sharp.quality).toBe("ok")

    // Zooming to 2x uses half the pixels per axis, so the DPI halves
    const zoomed = computePrintMetrics({
      printArea: mousepad,
      sourceWidthPx: 6000,
      sourceHeightPx: 3000,
      placement: { scale: 2, offsetXPct: 0, offsetYPct: 0 },
    })
    await expect(zoomed.effectiveDpi).toBe(84)
    await expect(zoomed.quality).toBe("low")

    // A phone screenshot on a 900 mm mousepad is the case Nikita named
    const phoneShot = computePrintMetrics({ printArea: mousepad, sourceWidthPx: 1200, sourceHeightPx: 800 })
    await expect(phoneShot.quality).toBe("low")
    await expect(phoneShot.requiredWidthPx).toBe(5315)
    await expect(phoneShot.requiredHeightPx).toBe(2363)

    // A rectangle drawn on the mockup with the wrong proportions is what makes a preview lie
    const drift = getAspectDrift(
      { leftPct: 5, topPct: 10, widthPct: 90, heightPct: 40 },
      mousepad,
      2000,
      1000,
    )
    await expect(drift).toBeGreaterThan(0.02)
  },
}
