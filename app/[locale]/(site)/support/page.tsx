import { BiSupport } from "react-icons/bi"
import { FaTelegramPlane } from "react-icons/fa"
import { MdOutlineEmail } from "react-icons/md"

import { OpenSupportChatButton } from "./components/OpenSupportChatButton"
import { Button } from "@/components/ui"
import { getI18n } from "@/locales/server"

export default async function SupportPage() {
  const t = await getI18n()
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-5xl flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-title tablet:text-4xl">{t("support.title")}</h1>
        <p className="mt-2 text-base text-subTitle">{t("support.subtitle")}</p>
      </div>

      <div className="grid gap-3 tablet:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-lg border border-border-color/35 bg-foreground/35 p-4 transition-colors duration-150 hover:border-brand/30">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-brand/20 bg-brand/10 text-brand">
            <MdOutlineEmail size={20} />
          </div>
          <h2 className="text-base font-semibold text-title">{t("support.option_1")}</h2>
          <p className="text-xs text-subTitle">{supportEmail}</p>
          <Button className="mt-auto" variant="default-outline" href={`mailto:${supportEmail}`}>
            {t("support.email_us")}
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border-color/35 bg-foreground/35 p-4 transition-colors duration-150 hover:border-brand/30">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-brand/20 bg-brand/10 text-brand">
            <BiSupport size={20} />
          </div>
          <h2 className="text-base font-semibold text-title">{t("support.option_2_title")}</h2>
          <p className="text-xs text-subTitle">{t("support.option_2_subtitle")}</p>
          <OpenSupportChatButton />
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border-color/35 bg-foreground/35 p-4 transition-colors duration-150 hover:border-brand/30">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-brand/20 bg-brand/10 text-brand">
            <FaTelegramPlane size={18} />
          </div>
          <h2 className="text-base font-semibold text-title">{t("support.option_3")}</h2>
          <Button className="mt-auto" variant="default-outline" href={process.env.NEXT_PUBLIC_TELEGRAM_URL} target="_blank">
            {t("support.open_telegram")}
          </Button>
        </div>
      </div>
    </div>
  )
}
