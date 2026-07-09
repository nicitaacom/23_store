import { BsStars } from "react-icons/bs"

import { useScopedI18n } from "@/locales/client"

export function ChatHeader() {
  const t = useScopedI18n("aichat")

  return (
    <div className="flex items-center gap-3 px-1">
      <div className="p-2 rounded-lg bg-success/10 border border-success/20">
        <BsStars className="text-lg text-success" />
      </div>
      <div>
        <h3 className="text-title font-semibold text-base">{t("header_title")}</h3>
        <p className="text-subTitle text-sm">{t("header_subtitle")}</p>
      </div>
    </div>
  )
}
