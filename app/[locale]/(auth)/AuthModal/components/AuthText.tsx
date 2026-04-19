import { useI18n } from "@/locales/client"

export function AuthText({ queryParams }: { queryParams: string | null }) {
  const t = useI18n()
  return (
    <h1 className="font-primary text-3xl font-bold leading-none text-title mobile:text-4xl">
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
