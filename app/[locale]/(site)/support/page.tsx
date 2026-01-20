import { Button } from "@/components/ui"
import { getI18n } from "@/locales/server"

export default async function SupportPage() {
  const t = await getI18n()
  return (
    <div className="w-full h-[calc(100vh-64px)] flex flex-col gap-y-8 justify-center items-center">
      <div className="flex flex-col gap-y-2 justify-center items-center">
        <h1>{t("support.option_1")}</h1>
        <p>{process.env.NEXT_PUBLIC_SUPPORT_EMAIL}</p>
      </div>

      <div className="flex flex-col gap-y-2 justify-center items-center">
        <h1>{t("support.option_2_title")}</h1>
        <p>{t("support.option_2_subtitle")}</p>
      </div>

      <div className="flex flex-col gap-y-2 justify-center items-center">
        <h1>{t("support.option_3")}</h1>
        <Button
          className="text-info hover:text-info hover:opacity-[99]"
          variant="link"
          href={process.env.NEXT_PUBLIC_TELEGRAM_URL}>
          {process.env.NEXT_PUBLIC_TELEGRAM_URL}
        </Button>
      </div>
    </div>
  )
}
