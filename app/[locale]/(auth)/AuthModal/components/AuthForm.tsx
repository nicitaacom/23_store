"use client"

import { ReactNode, useState } from "react"
import { usePathname } from "next/navigation"
import { twMerge } from "tailwind-merge"
import { FieldErrors, UseFormHandleSubmit, UseFormRegister } from "react-hook-form"
import { AiOutlineLock, AiOutlineMail, AiOutlineUser } from "react-icons/ai"

import { AuthContinueWith } from "./AuthContinueWith"
import { IAuthFormData } from "../AuthModal"
import { useI18n } from "@/locales/client"
import { Button, Checkbox } from "@/components/ui"
import { FormInput } from "@/components/ui/Inputs/Validation"

interface AuthFormProps {
  handleSubmit: UseFormHandleSubmit<IAuthFormData, undefined>
  onSubmit: (data: IAuthFormData) => Promise<void>
  queryParams: "login" | "register" | "recover" | "resetPassword"
  register: UseFormRegister<IAuthFormData>
  errors: FieldErrors<IAuthFormData>
  isSubmitting: boolean
  isEmailSent: boolean
  responseMessage: ReactNode | null
}

export function AuthForm({
  handleSubmit,
  onSubmit,
  queryParams,
  register,
  errors,
  isSubmitting,
  isEmailSent,
  responseMessage,
}: AuthFormProps) {
  const pathname = usePathname() || ""
  const t = useI18n()

  const [isChecked, setIsChecked] = useState(false)

  return (
    <>
      <form className="relative mb-3 flex w-full max-w-full flex-col gap-y-4" onSubmit={handleSubmit(onSubmit)}>
        {queryParams !== "resetPassword" && (
          <FormInput
            className="h-11 rounded-2xl"
            endIcon={<AiOutlineMail size={24} />}
            register={register}
            errors={errors}
            id="email"
            label={t("auth.email.label")}
            placeholder={t("auth.email.placeholder")}
            disabled={isSubmitting || isEmailSent}
            required
            validationMessages={{
              required: t("auth.email.validation.required"),
              pattern: t("auth.email.validation.invalid"),
            }}
          />
        )}
        {queryParams !== "recover" && (
          <FormInput
            className="h-11 rounded-2xl"
            endIcon={<AiOutlineLock size={24} />}
            register={register}
            errors={errors}
            id="password"
            label={t("auth.password.label")}
            type="password"
            placeholder={
              queryParams === "register" || queryParams === "resetPassword"
                ? t("auth.password.placeholder_new")
                : t("auth.password.placeholder")
            }
            disabled={isSubmitting || isEmailSent}
            required
            validationMessages={{
              required: t("auth.password.validation.required"),
              pattern: t("auth.validation.password_invalid"),
            }}
          />
        )}
        {queryParams === "register" && (
          <FormInput
            className="h-11 rounded-2xl"
            endIcon={<AiOutlineUser size={24} />}
            register={register}
            errors={errors}
            id="username"
            label={t("auth.username.label")}
            placeholder={t("auth.username.placeholder")}
            disabled={isSubmitting || isEmailSent}
            required
            validationMessages={{
              required: t("auth.validation.username.required"),
              pattern: t("auth.validation.username_invalid"),
            }}
          />
        )}

        {/* REMBMBER-ME / FORGOT-PASSWORD */}
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className={twMerge("invisible flex min-h-[20px] items-center", queryParams === "login" && "visible")}>
            {/* 'Remember me' now checkbox do nothing - expected !isChecked 1m jwt - isChecked 3m jwt */}
            <Checkbox
              label={t("auth.remember.me")}
              onChange={() => setIsChecked(isChecked => !isChecked)}
              disabled={isSubmitting}
              isChecked={isChecked}
            />
          </div>
          {queryParams !== "register" && (
            <Button
              className="text-sm mobile:text-base"
              href={`${pathname}?modal=AuthModal&variant=${queryParams === "login" ? "recover" : "login"}`}
              variant="link">
              {queryParams === "login" ? t("auth.forgot.password") : t("auth.sign.in")}
            </Button>
          )}
        </div>

        {/* LOGIN/REGISTER BUTTON */}
        <Button
          type="submit"
          variant="default-outline"
          size="xl"
          rounded="xl"
          fullWidth
          className="mt-1 border-border-color/45 bg-background/55"
          disabled={isSubmitting || isEmailSent}>
          {queryParams === "login"
            ? t("auth.sign.in")
            : queryParams === "register"
              ? t("auth.sign.up")
              : queryParams === "recover" || queryParams === "resetPassword"
                ? t("auth.recovery.button")
                : "TODO - contact support - ask to translate it - попросите поддержку перевести этот текст"}
        </Button>
        {responseMessage ? <div className="flex justify-center text-center text-sm">{responseMessage}</div> : null}
      </form>

      {/* CONTINUE WITH (for login and register only) */}
      {(queryParams === "login" || queryParams === "register") && (
        <AuthContinueWith isEmailSent={isEmailSent} isSubmitting={isSubmitting} queryParams={queryParams} pathname={pathname} />
      )}
    </>
  )
}
