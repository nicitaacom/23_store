import Script from "next/script"
import { getSafeNextPath } from "@/utils/turnstile"
import { TurnstileChallenge } from "./TurnstileChallenge"

export default function HumanCheckPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams?: { next?: string }
}) {
  const nextPath = getSafeNextPath(searchParams?.next, locale)

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <TurnstileChallenge locale={locale} nextPath={nextPath} />
    </>
  )
}
