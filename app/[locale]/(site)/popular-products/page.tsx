import { BannersSlider } from "./BannersSlider"
import { PopularProductsLazyFeed } from "./PopularProductsLazyFeed"
import { getI18n } from "@/locales/server"
import { selectPopularProducts } from "@/libs/popularProducts"

interface PopularProductsPageProps {
  params: Promise<{ locale: string }>
}

export default async function PopularProductsPage({ params: paramsPromise }: PopularProductsPageProps) {
  const params = await paramsPromise
  const t = await getI18n()
  const { products, totalItems } = await selectPopularProducts({ limit: 24 })

  return (
    <div className="mx-auto min-h-[calc(100dvh-64px)] w-full px-0 pb-20 text-title tablet:px-3 tablet:pt-2 laptop:h-[calc(100vh-64px)] laptop:overflow-hidden laptop:px-4 laptop:pb-2" data-cy="popular-products-shell">
      <section className="mx-auto flex w-full max-w-[1800px] flex-col tablet:rounded-[4px] tablet:border tablet:border-success/15 tablet:bg-gradient-to-br tablet:from-success/5 tablet:via-background tablet:to-background tablet:px-4 tablet:py-3 tablet:shadow-2xl tablet:shadow-success/5 laptop:h-full laptop:overflow-x-hidden laptop:overflow-y-auto laptop:[scrollbar-gutter:stable]">
        <div className="mb-2 flex flex-col gap-1 tablet:mb-4 tablet:flex-row tablet:items-start tablet:gap-4">
          <div className="flex w-full min-w-0 flex-col items-center justify-center gap-1 text-center tablet:w-1/2 tablet:items-start tablet:gap-3 tablet:px-2 tablet:text-left">
            <div className="inline-flex w-fit items-center rounded-[4px] border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-medium text-success tablet:px-3 tablet:py-1 tablet:text-sm">
              {t("popular.badge")}
            </div>
            <h1 className="min-w-0 break-words text-xl font-semibold leading-tight tracking-tight text-title tablet:text-3xl laptop:text-4xl">
              {t("popular.title")}
            </h1>
            <p className="min-w-0 max-w-prose break-words text-sm leading-5 text-subTitle tablet:text-base tablet:leading-7">
              {t("popular.subtitle")}
            </p>
          </div>
          <div className="h-[112px] w-full min-w-0 tablet:h-[320px] tablet:w-1/2">
            <BannersSlider />
          </div>
        </div>

        <PopularProductsLazyFeed initialProducts={products} locale={params.locale} totalItems={totalItems} />
      </section>
    </div>
  )
}
