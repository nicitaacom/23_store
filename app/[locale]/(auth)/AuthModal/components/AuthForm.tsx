"use client"

import { usePathname } from "next/navigation"
import { ReactNode, useState } from "react"
import { twMerge } from "tailwind-merge"
import { FieldErrors, UseFormHandleSubmit, UseFormRegister } from "react-hook-form"

import { FormInput } from "@/components/ui/Inputs/Validation"
import { AiOutlineLock, AiOutlineMail, AiOutlineUser } from "react-icons/ai"
import { AuthFormData } from "../AuthModal"
import { Button, Checkbox } from "@/components/ui"
import { AuthContinueWith } from "./AuthContinueWith"
import { useI18n } from "@/locales/client"

interface AuthFormProps {
  handleSubmit: UseFormHandleSubmit<AuthFormData, undefined>
  onSubmit: (data: AuthFormData) => Promise<void>
  queryParams: "login" | "register" | "recover" | "resetPassword"
  register: UseFormRegister<AuthFormData>
  errors: FieldErrors<AuthFormData>
  isSubmitting: boolean
  isEmailSent: boolean
  responseMessage: ReactNode
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
      <form className="relative max-w-[450px] w-[75vw] flex flex-col gap-y-3 mb-3" onSubmit={handleSubmit(onSubmit)}>
        {queryParams !== "resetPassword" && (
          <FormInput
            className="rounded-[10px]"
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
            className="rounded-[10px]"
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
            className="rounded-[10px]"
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
        <div className="flex justify-between mb-1">
          <div className={twMerge(`invisible`, queryParams === "login" && "visible")}>
            {/* 'Remember me' now checkbox do nothing - expected !isChecked 1m jwt - isChecked 3m jwt */}
            <Checkbox
              className="bg-background cursor-pointer"
              label={t("auth.remember.me")}
              onChange={() => setIsChecked(isChecked => !isChecked)}
              disabled={isSubmitting}
              isChecked={isChecked}
            />
          </div>
          {queryParams !== "register" && (
            <Button href={`${pathname}?modal=AuthModal&variant=${queryParams === "login" ? "recover" : "login"}`} variant="link">
              {queryParams === "login" ? t("auth.forgot.password") : t("auth.sign.in")}
            </Button>
          )}
        </div>

        {/* LOGIN/REGISTER BUTTON */}
        <Button variant="default-outline" disabled={isSubmitting || isEmailSent}>
          {queryParams === "login"
            ? t("auth.sign.in")
            : queryParams === "register"
              ? t("auth.sign.up")
              : queryParams === "recover" || queryParams === "resetPassword"
                ? t("auth.recovery.button")
                : "TODO - contact support - ask to translate it - попросите поддержку перевести этот текст"}
        </Button>
        <div className="flex justify-center text-center">{responseMessage}</div>
      </form>

      {/* CONTINUE WITH (for login and register only) */}
      {(queryParams === "login" || queryParams === "register") && (
        <AuthContinueWith isEmailSent={isEmailSent} isSubmitting={isSubmitting} queryParams={queryParams} pathname={pathname} />
      )}
    </>
  )
}
