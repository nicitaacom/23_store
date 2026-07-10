import { cache } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BiArrowBack, BiChevronRight } from "react-icons/bi"

import { ManageProductView } from "./ManageProductView"
import { getScopedI18n } from "@/locales/server"
import { normalizeProduct } from "@/utils/productVariants"
import supabaseServer from "@/libs/supabase/supabaseServer"
import { toProductLocale } from "@/utils/product"

interface ManageProductPageProps {
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

export async function generateMetadata({ params: paramsPromise }: ManageProductPageProps): Promise<Metadata> {
  const params = await paramsPromise
  const getProductByIdResp = await getProductById(params.productId)
  const translation = getProductByIdResp
    ? getProductByIdResp.translations[toProductLocale(params.locale)] ?? getProductByIdResp.translations.fi
    : null

  return {
    title: translation ? `Manage ${translation.title} - Joki` : "Manage product - Joki",
    description: translation?.description ?? "Manage product page",
  }
}

export default async function ManageProductPage({ params: paramsPromise }: ManageProductPageProps) {
  const params = await paramsPromise
  const t = await getScopedI18n("product")
  const getProductByIdResp = await getProductById(params.productId)
  const translation = getProductByIdResp
    ? getProductByIdResp.translations[toProductLocale(params.locale)] ?? getProductByIdResp.translations.fi
    : null
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!getProductByIdResp || !user || user.id !== getProductByIdResp.owner_id) {
    notFound()
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-[1600px] px-4 py-6 text-title">
      <section className="flex flex-col gap-5">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-subTitle">
          <Link href={`/${params.locale}`} className="transition-colors duration-200 hover:text-success">
            {t("products")}
          </Link>
          <BiChevronRight className="text-base opacity-60" />
          <Link
            href={`/${params.locale}/products/${getProductByIdResp.id}`}
            className="transition-colors duration-200 hover:text-success">
            {translation?.title}
          </Link>
          <BiChevronRight className="text-base opacity-60" />
          <span className="text-title">{t("manage_product")}</span>
        </nav>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${params.locale}/products/${getProductByIdResp.id}`}
            className="inline-flex w-fit items-center gap-2 rounded-[4px] border border-success/18 bg-success/8 px-4 py-2 text-sm font-semibold text-success transition-colors duration-300 hover:border-success/35 hover:bg-success/14 hover:text-title">
            <BiArrowBack className="text-lg" />
            {t("view_product")}
          </Link>
          <Link
            href={`/${params.locale}`}
            className="inline-flex w-fit items-center gap-2 rounded-[4px] border border-white/8 bg-[#0f1318] px-4 py-2 text-sm font-semibold text-title transition-colors duration-300 hover:border-success/22 hover:bg-[#151b24]">
            <BiArrowBack className="text-lg" />
            {t("back_to_catalog")}
          </Link>
        </div>

        <ManageProductView product={getProductByIdResp} />
      </section>
    </div>
  )
}
