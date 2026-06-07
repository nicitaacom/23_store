import Link from "next/link"

export default async function JotionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return (
    <section className="flex min-h-[calc(100vh-64px)] items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-[18px] border border-border-color bg-foreground px-6 py-8 text-title shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <p className="mb-2 text-xs uppercase tracking-[0.24em] text-subTitle">Project</p>
        <h1 className="mb-3 text-4xl font-bold">Jotion</h1>
        <p className="mb-6 text-base text-subTitle">This section is ready and linked from the hamburger menu.</p>
        <Link className="text-info underline-offset-4 hover:underline" href={`/${locale}`}>
          Back to home
        </Link>
      </div>
    </section>
  )
}
