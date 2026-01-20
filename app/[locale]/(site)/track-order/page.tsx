"use client"

import { Button } from "@/components/ui"
import { useScopedI18n } from "@/locales/client"
import { useState } from "react"
import { twMerge } from "tailwind-merge"

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("")
  const t = useScopedI18n("trackorder")

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-background">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 laptop:grid-cols-2">
        {/* LEFT */}
        <div className="flex h-full flex-col gap-6 p-4 laptop:p-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/20 text-xl">📦</div>
            <div>
              <h1 className="text-2xl font-bold text-title">{t("title")}</h1>
              <p className="text-xs text-subTitle">{t("subtitle")}</p>
            </div>
          </div>

          {/* Search card */}
          <div className="rounded-xl border border-border-color bg-foreground p-4 shadow-sm">
            <label className="mb-2 block text-xs font-medium text-title">{t("order_number")}</label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-border-color bg-background px-3 py-2 text-sm text-title
                           placeholder:text-subTitle focus:border-success focus:outline-none focus:ring-1 focus:ring-success/30"
                placeholder="ORD-123456"
                value={orderNumber}
                disabled
                onChange={event => setOrderNumber(event.target.value)}
              />
              <Button
                disabled
                className="rounded-lg bg-success px-5 text-sm font-semibold
                           opacity-60 transition hover:bg-success-accent">
                {t("track")}
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl border border-success/30 bg-success/10 p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">⏳</span>
              <div>
                <p className="text-sm font-semibold text-title">{t("tracking_not_available_title")}</p>
                <p className="mt-1 text-xs text-subTitle">{t("tracking_not_available_subtitle")}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 rounded-xl border border-border-color bg-foreground p-4 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-title">{t("order_status")}</p>

            <div className="relative space-y-5 pl-6">
              <div className="absolute left-[11px] top-0 h-full w-px bg-border-color" />

              {[
                { title: t("order_status_1_title"), desc: t("order_status_1_subtitle"), active: true },
                { title: t("order_status_2_title"), desc: t("order_status_1_subtitle"), active: true },
                { title: t("order_status_3_title"), desc: t("order_status_1_subtitle"), active: false },
                { title: t("order_status_4_title"), desc: t("order_status_1_subtitle"), active: false },
                { title: t("order_status_5_title"), desc: t("order_status_1_subtitle"), active: false },
              ].map(step => (
                <div key={step.title} className="relative flex gap-3">
                  <div
                    className={twMerge(
                      "z-10 h-4 w-4 rounded-full border-2 border-background",
                      step.active ? "bg-success" : "bg-border-color/40",
                    )}
                  />
                  <div className={step.active ? "" : "opacity-40"}>
                    <p className="text-sm font-medium text-title">{step.title}</p>
                    <p className="text-xs text-subTitle">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer links */}
          <div className="flex justify-center gap-3 text-xs">
            <a className="font-medium text-success hover:text-success-accent" href="/support">
              {t("support")}
            </a>
            <span className="text-border-color">•</span>
            <a className="font-medium text-success hover:text-success-accent" href="/feedback">
              {t("feedback")}
            </a>
          </div>
        </div>

        {/* RIGHT · MAP */}
        <div className="relative hidden laptop:block border-l border-border-color">
          <iframe
            className="h-full w-full"
            src="https://yandex.com/map-widget/v1/?ll=24.9384%2C60.1699&z=12&theme=dark"
            loading="lazy"
          />

          <div className="absolute left-4 top-4 rounded-xl border border-border-color bg-background/95 p-3 backdrop-blur">
            {/* TODO - replace this placeholder with actuall delivery-address */}
            <p className="text-xs font-medium text-title">📍 Helsinki, Finland</p>
            <p className="mt-1 text-xs text-subTitle">{t("location_available_after_shipment")}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
