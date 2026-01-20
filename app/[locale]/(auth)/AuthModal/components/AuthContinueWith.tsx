import { Button } from "@/components/ui"
import { ContinueWithButton } from "./ContinueWithButton"
import { twMerge } from "tailwind-merge"
import { useI18n } from "@/locales/client"

interface AuthContinueWithProps {
  isSubmitting: boolean
  isEmailSent: boolean
  queryParams: "login" | "register"
  pathname: string
}

export function AuthContinueWith({ isSubmitting, isEmailSent, queryParams, pathname }: AuthContinueWithProps) {
  const t = useI18n()
  return (
    <section className="flex flex-col gap-y-4 text-center">
      <p>{t("auth.or.continue")}</p>
      <div className={`grid grid-cols-3 gap-x-2 ${isSubmitting && "opacity-50 cursor-default pointer-events-none"}`}>
        <ContinueWithButton provider="google" />
        <ContinueWithButton provider="faceit" />
        <ContinueWithButton provider="twitter" />
      </div>
      <Button
        className={twMerge(`pr-1`, isEmailSent && "opacity-50 pointer-events-none cursor-default")}
        href={`${pathname}?modal=AuthModal&variant=${queryParams === "login" ? "register" : "login"}`}
        variant="link"
        disabled={isEmailSent}>
        {queryParams === "login" ? t("auth.register.button") : t("auth.login.button")}
      </Button>
    </section>
  )
}
