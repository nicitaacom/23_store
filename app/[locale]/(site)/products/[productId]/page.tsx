import { cache } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BiArrowBack, BiChevronRight } from "react-icons/bi"

import supabaseServer from "@/libs/supabase/supabaseServer"
import { getScopedI18n } from "@/locales/server"
import { normalizeProduct } from "@/utils/productVariants"
import { ProductDetailView } from "./ProductDetailView"

interface ProductPageProps {
  params: {
    locale: string
    productId: string
  }
}

const getProductById = cache(async (productId: string) => {
  const productResponse = await supabaseServer().from("products").select("*").eq("id", productId).maybeSingle()

  if (productResponse.error) {
    throw productResponse.error
  }

  if (!productResponse.data) {
    return null
  }

  return normalizeProduct(productResponse.data)
})

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductById(params.productId)

  return {
    title: product ? `${product.title} - Joki` : "Product - Joki",
    description: product?.sub_title ?? "Product page",
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const t = await getScopedI18n("product")
  const product = await getProductById(params.productId)

  if (!product) {
    notFound()
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-[1500px] px-4 py-6 text-title">
      <section className="flex flex-col gap-5">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-subTitle">
          <Link href={`/${params.locale}`} className="transition-colors duration-200 hover:text-success">
            {t("products")}
          </Link>
          <BiChevronRight className="text-base opacity-60" />
          <span className="max-w-full truncate text-title">{product.title}</span>
        </nav>

        <Link
          href={`/${params.locale}`}
          className="inline-flex w-fit items-center gap-2 rounded-[4px] border border-success/25 bg-success/5 px-4 py-2 text-sm font-semibold text-success transition-colors duration-300 hover:border-success hover:bg-success hover:text-black">
          <BiArrowBack className="text-lg" />
          {t("back_to_catalog")}
        </Link>

        <ProductDetailView product={product} />
      </section>
    </div>
  )
}
