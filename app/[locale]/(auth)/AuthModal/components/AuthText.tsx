import { useI18n } from "@/locales/client"

export function AuthText({ queryParams }: { queryParams: string | null }) {
  const t = useI18n()
  return (
    <h1 className="text-[34px] leading-none font-bold">
      {queryParams === "login"
        ? t("auth.sign.in")
        : queryParams === "register"
          ? t("auth.sign.up")
          : queryParams === "recover"
            ? t("auth.forgot.password")
            : queryParams === "resetPassword"
              ? t("auth.forgot.password")
              : queryParams === "recoverCompleted"
                ? t("auth.recover.completed")
                : t("auth.auth.completed")}
    </h1>
  )
}
