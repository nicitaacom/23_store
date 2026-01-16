"use client"

import { Button } from "@/components/ui"
import { useState } from "react"
import { twMerge } from "tailwind-merge"

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("")

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-background">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 laptop:grid-cols-2">
        {/* LEFT */}
        <div className="flex h-full flex-col gap-6 p-4 laptop:p-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/20 text-xl">📦</div>
            <div>
              <h1 className="text-2xl font-bold text-title">Track order</h1>
              <p className="text-xs text-subTitle">Real-time delivery progress</p>
            </div>
          </div>

          {/* Search card */}
          <div className="rounded-xl border border-border-color bg-foreground p-4 shadow-sm">
            <label className="mb-2 block text-xs font-medium text-title">Order number</label>
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
                Track
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl border border-success/30 bg-success/10 p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">⏳</span>
              <div>
                <p className="text-sm font-semibold text-title">Tracking not available yet</p>
                <p className="mt-1 text-xs text-subTitle">Tracking number will be sent within 24–48 hours.</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 rounded-xl border border-border-color bg-foreground p-4 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-title">Order status</p>

            <div className="relative space-y-5 pl-6">
              <div className="absolute left-[11px] top-0 h-full w-px bg-border-color" />

              {[
                { title: "Order confirmed", desc: "We got your order", active: true },
                { title: "Processing", desc: "Preparing shipment", active: true },
                { title: "Shipped", desc: "Package on route", active: false },
                { title: "Out for delivery", desc: "Courier nearby", active: false },
                { title: "Delivered", desc: "Delivered to address", active: false },
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
              Support
            </a>
            <span className="text-border-color">•</span>
            <a className="font-medium text-success hover:text-success-accent" href="/feedback">
              Feedback
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
            <p className="text-xs font-medium text-title">📍 Helsinki, Finland</p>
            <p className="mt-1 text-xs text-subTitle">Location visible after shipment</p>
          </div>
        </div>
      </div>
    </div>
  )
}
