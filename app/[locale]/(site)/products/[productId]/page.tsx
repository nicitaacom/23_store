import { cache } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BiArrowBack, BiChevronRight } from "react-icons/bi"

import { ProductDetailView } from "./ProductDetailView"
import supabaseServer from "@/libs/supabase/supabaseServer"
import { getScopedI18n } from "@/locales/server"
import { toProductLocale } from "@/utils/product"
import { normalizeProduct } from "@/utils/productVariants"

interface ProductPageProps {
  params: Promise<{
    locale: string
    productId: string
  }>
}

const getProductById = cache(async (productId: string) => {
  const supabase = await supabaseServer()
  const productResponse = await supabase.from("23_products").select("*").eq("id", productId).maybeSingle()

  if (productResponse.error) {
    throw productResponse.error
  }

  if (!productResponse.data) {
    return null
  }

  return normalizeProduct(productResponse.data)
})

export async function generateMetadata({ params: paramsPromise }: ProductPageProps): Promise<Metadata> {
  const params = await paramsPromise
  const product = await getProductById(params.productId)
  const translation = product ? product.translations[toProductLocale(params.locale)] ?? product.translations.fi : null

  return {
    title: translation ? `${translation.title} - Joki` : "Product - Joki",
    description: translation?.description ?? "Product page",
  }
}

export default async function ProductPage({ params: paramsPromise }: ProductPageProps) {
  const params = await paramsPromise
  const t = await getScopedI18n("product")
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  const product = await getProductById(params.productId)
  const translation = product ? product.translations[toProductLocale(params.locale)] ?? product.translations.fi : null

  if (!product) {
    notFound()
  }

  return (
    <div className="min-h-[calc(100vh-64px)] w-full px-4 py-6 text-title">
      <section className="flex flex-col gap-5">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-subTitle">
          <Link href={`/${params.locale}`} className="transition-colors duration-200 hover:text-success">
            {t("products")}
          </Link>
          <BiChevronRight className="text-base opacity-60" />
          <span className="max-w-full truncate text-title">{translation?.title}</span>
        </nav>

        <Link
          href={`/${params.locale}`}
          className="inline-flex w-fit items-center gap-2 rounded-[4px] border border-success/25 bg-success/5 px-4 py-2 text-sm font-semibold text-success transition-colors duration-300 hover:border-success hover:bg-success hover:text-black">
          <BiArrowBack className="text-lg" />
          {t("back_to_catalog")}
        </Link>

        <ProductDetailView product={product} isAuthenticated={!!user} />
      </section>
    </div>
  )
}
