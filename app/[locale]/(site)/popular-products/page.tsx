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
    <div className="mx-auto h-[calc(100vh-64px)] w-full overflow-hidden px-4 py-2 text-title">
      <section className="panel-scroll mx-auto flex h-full w-full max-w-[1800px] flex-col overflow-x-hidden overflow-y-auto rounded-[4px] border border-success/15 bg-gradient-to-br from-success/5 via-background to-background px-4 py-3 shadow-2xl shadow-success/5">
        <div className="mb-4 flex items-start gap-4">
          <div className="flex w-1/2 flex-col justify-center gap-3 px-2">
            <div className="inline-flex w-fit items-center rounded-[4px] border border-success/30 bg-success/10 px-3 py-1 text-sm font-medium text-success">
              {t("popular.badge")}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-title laptop:text-4xl">{t("popular.title")}</h1>
            <p className="text-base leading-7 text-subTitle">{t("popular.subtitle")}</p>
          </div>
          <div className="h-[320px] w-1/2">
            <BannersSlider />
          </div>
        </div>

        <PopularProductsLazyFeed initialProducts={products} locale={params.locale} totalItems={totalItems} />
      </section>
    </div>
  )
}
