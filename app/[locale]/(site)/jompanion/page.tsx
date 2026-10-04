import Link from "next/link"

import { getScopedI18n } from "@/locales/server"

export default async function JompanionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getScopedI18n("placeholder")
  return (
    <section className="flex min-h-[calc(100dvh-64px)] items-center justify-center px-6 py-16 max-[767px]:px-0 max-[767px]:py-2">
      <div className="w-full max-w-2xl rounded-[18px] border border-border-color bg-foreground px-6 py-8 text-title shadow-[0_24px_80px_rgba(0,0,0,0.18)] max-[767px]:rounded-md max-[767px]:px-2 max-[767px]:py-3">
        <p className="mb-2 text-xs uppercase tracking-[0.24em] text-subTitle">{t("eyebrow")}</p>
        {/* eslint-disable-next-line local-rules/no-untranslated-ui -- project brand name, not translated */}
        <h1 className="mb-3 text-4xl font-bold max-[767px]:mb-2 max-[767px]:text-2xl">Jompanion</h1>
        <p className="mb-6 text-base text-subTitle max-[767px]:mb-3 max-[767px]:text-sm">{t("body")}</p>
        <Link className="inline-flex min-h-[44px] items-center text-info underline-offset-4 hover:underline" href={`/${locale}`}>
          {t("back_home")}
        </Link>
      </div>
    </section>
  )
}
