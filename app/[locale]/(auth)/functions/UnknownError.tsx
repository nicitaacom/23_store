import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { Button } from "@/components/ui"

// http://localhost:6006/?path=/story/authentication-authpieces--headers-per-variant
export function UnknownError({ t }: { t: TI18nFunction }) {
  return (
    <div className="text-danger flex flex-row">
      <p>{t("auth.error.unknown")}&nbsp;</p>
      <Button className="text-info" href={process.env.NEXT_PUBLIC_TELEGRAM_URL} variant="link">
        {t("auth.here")}
      </Button>
    </div>
  )
}
