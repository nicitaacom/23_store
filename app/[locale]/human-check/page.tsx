import Script from "next/script"
import { getSafeNextPath } from "@/utils/turnstile"
import { TurnstileChallenge } from "./TurnstileChallenge"

export default async function HumanCheckPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ next?: string }>
}) {
  const { locale } = await params
  const resolvedSearchParams = await searchParams
  const nextPath = getSafeNextPath(resolvedSearchParams?.next, locale)

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <TurnstileChallenge locale={locale} nextPath={nextPath} />
    </>
  )
}
