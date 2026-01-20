import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"

export function UserExistEmailNotConfirmed({ t }: { t: TI18nFunction }) {
  return (
    <div className="flex flex-col justify-center items-center">
      <p className="text-danger">{t("auth.register.user_exist_email_not_confirmed")}</p>
      <p className="text-danger">{t("auth.error.not_verified_email_check_your_email")}</p>
    </div>
  )
}
