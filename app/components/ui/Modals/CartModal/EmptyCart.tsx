import Image from "next/image"

import { useScopedI18n } from "@/locales/client"

// http://localhost:6006/?path=/story/commerce-cartcomposition--empty
export default function EmptyCart() {
  const t = useScopedI18n("product")
  return (
    <div className="flex flex-col justify-center items-center">
      <Image src="/empty-cart.png" alt="" width={256} height={256} />
      <h1 className="text-4xl">{t("empty_cart")}</h1>
    </div>
  )
}
