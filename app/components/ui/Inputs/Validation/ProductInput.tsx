"use client"

import React, { useRef } from "react"
import { motion } from "framer-motion"
import { FieldErrors, UseFormRegister } from "react-hook-form"
import { twMerge } from "tailwind-merge"

import { formatGroupedNumberInput } from "@/utils/numberFormatter"
import { useScopedI18n } from "@/locales/client"
import {
  MAX_PRODUCT_DESCRIPTION_LENGTH,
  MAX_PRODUCT_TITLE_LENGTH,
  MIN_PRODUCT_DESCRIPTION_LENGTH,
  MIN_PRODUCT_TITLE_LENGTH,
} from "@/constants/productLimits"
import {
  PRODUCT_DESCRIPTION_INVALID_CHARACTER_REGEX,
  PRODUCT_TITLE_INVALID_CHARACTER_REGEX,
  PRODUCT_TITLE_HAS_LETTER_REGEX,
  PRODUCT_TITLE_MUST_START_REGEX,
  getInvalidCharacterDetails,
} from "@/utils/productValidation"

interface FormData {
  title: string
  subTitle: string
  price: number
  onStock: number
}

interface InputFormProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: keyof FormData
  className?: string
  type?: string | "numeric"
  numericFormat?: "grouped"
  required?: boolean
  register: UseFormRegister<FormData>
  startIcon?: React.ReactElement
  endIcon?: React.ReactElement
  errors: FieldErrors
  placeholder: string
  disabled?: boolean
  externalTextareaRef?: React.MutableRefObject<HTMLTextAreaElement | null>
}

interface ValidationRules {
  [key: string]: {
    requiredMessage: string
    pattern?: {
      value: RegExp
      message: string
    }
  }
}

// http://localhost:6006/?path=/story/authentication-authexample--sign-in
export function ProductInput({
  className = "",
  id,
  type = "text",
  numericFormat,
  required,
  register,
  startIcon,
  endIcon,
  errors,
  placeholder,
  disabled,
  externalTextareaRef,
  onInput,
  onBlur: onBlurProp,
  ...props
}: InputFormProps) {
  const t = useScopedI18n("product")

  const getInvalidCharacterMessage = (fieldId: keyof FormData, value: string) => {
    const invalidCharacterDetails = getInvalidCharacterDetails(
      value,
      fieldId === "subTitle" ? PRODUCT_DESCRIPTION_INVALID_CHARACTER_REGEX : PRODUCT_TITLE_INVALID_CHARACTER_REGEX,
    )
    if (!invalidCharacterDetails) return null

    return fieldId === "subTitle"
      ? t("description_invalid_character", invalidCharacterDetails)
      : t("title_invalid_character", invalidCharacterDetails)
  }

  const validationRules: ValidationRules = {
    title: {
      requiredMessage: t("this_field_is_required"),
    },
    subTitle: {
      requiredMessage: t("this_field_is_required"),
    },
    price: {
      requiredMessage: t("this_field_is_required"),
      pattern: {
        value: /^(?:0\.\d{1,2}|[1-9][0-9]{0,5}(?:\.\d{1,2})?)$/,
        message: t("price_required"),
      },
    },
    onStock: {
      requiredMessage: t("this_field_is_required"),
      pattern: {
        value: /^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d{1,2})?$/,
        message: t("on_stock_required"),
      },
    },
  }

  const { requiredMessage: requiredMessage, pattern } = validationRules[id]
  const patternValue = pattern?.value
  const patternMessage = pattern?.message

  const registerOptions = {
    required: required ? requiredMessage : undefined,
    pattern:
      patternValue && patternMessage
        ? {
            value: patternValue,
            message: patternMessage,
          }
        : undefined,
    validate:
      id === "title"
        ? (value: string | number) => {
            const titleValue = String(value ?? "")
            if (!titleValue || (patternValue && patternValue.test(titleValue))) return true
            const invalidCharacterMessage = getInvalidCharacterMessage(id, titleValue)
            if (invalidCharacterMessage) return invalidCharacterMessage
            if (titleValue.length < MIN_PRODUCT_TITLE_LENGTH) return t("title_too_short")
            if (titleValue.length > MAX_PRODUCT_TITLE_LENGTH)
              return t("title_too_long", { current: titleValue.length, max: MAX_PRODUCT_TITLE_LENGTH })
            if (!PRODUCT_TITLE_HAS_LETTER_REGEX.test(titleValue)) return t("title_must_contain_letter")
            if (!PRODUCT_TITLE_MUST_START_REGEX.test(titleValue)) return t("title_must_start_alphanumeric")
            return patternMessage
          }
        : id === "subTitle"
          ? (value: string | number) => {
              const subtitleValue = String(value ?? "").replace(/\r/g, "")
              if (!subtitleValue.trim()) return required ? t("this_field_is_required") : true
              if (subtitleValue.trim().length < MIN_PRODUCT_DESCRIPTION_LENGTH) return t("description_too_short")
              if (subtitleValue.length > MAX_PRODUCT_DESCRIPTION_LENGTH)
                return t("description_too_long", { max: MAX_PRODUCT_DESCRIPTION_LENGTH })
              const invalidCharacterMessage = getInvalidCharacterMessage(id, subtitleValue)
              if (invalidCharacterMessage) return invalidCharacterMessage
              return true
            }
          : undefined,
  }

  const { ref, ...rest } = {
    ...register(id, registerOptions),
  }
  const { ref: textArea, ...textareaRest } = {
    ...register(id, registerOptions),
  }

  const inputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const errorMessage = errors[id]?.message as React.ReactNode

  return (
    <div className="relative">
      {startIcon && (
        <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-icon-color">{startIcon}</div>
      )}
      {id === "subTitle" ? (
        <textarea
          className={twMerge(
            "min-h-[92px] w-full resize-y rounded border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors duration-150 placeholder:text-white/32 focus:border-white/20 focus:bg-white/[0.06]",
            startIcon && "pl-8",
            endIcon && "pr-8",
            errors[id] &&
              errors[id]?.message &&
              "border-danger/70 focus:border-danger/70 focus:shadow-[inset_0_0_0_1px_hsl(var(--danger)/0.28)] focus-visible:outline-none",
            disabled && "opacity-50 cursor-default",
            className,
          )}
          {...textareaRest}
          id={id}
          autoComplete={id}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={MAX_PRODUCT_DESCRIPTION_LENGTH}
          rows={6}
          ref={e => {
            textArea(e)
            textareaRef.current = e
            if (externalTextareaRef) externalTextareaRef.current = e
          }}
        />
      ) : (
        <input
          className={twMerge(
            "w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors duration-150 placeholder:text-white/32 focus:border-white/20 focus:bg-white/[0.06]",
            startIcon && "pl-8",
            endIcon && "pr-8",
            errors[id] &&
              errors[id]?.message &&
              "border-danger/70 focus:border-danger/70 focus:shadow-[inset_0_0_0_1px_hsl(var(--danger)/0.28)] focus-visible:outline-none",
            disabled && "opacity-50 cursor-default",
            className,
          )}
          {...rest}
          onBlur={e => { rest.onBlur?.(e); onBlurProp?.(e) }}
          id={id}
          type={type}
          autoComplete={id}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={id === "title" ? MAX_PRODUCT_TITLE_LENGTH : props.maxLength}
          onInput={event => {
            if (type === "numeric" && numericFormat === "grouped") {
              event.currentTarget.value = formatGroupedNumberInput(event.currentTarget.value)
            }

            onInput?.(event)
          }}
          onKeyDown={e => {
            if (type === "numeric") {
              if (e.metaKey || e.ctrlKey) return

              const { key, target } = e
              const { value } = target as HTMLInputElement
              const regex = numericFormat === "grouped" ? /^(?!\..)[0-9.,]+$/ : /^(?!\..)[0-9.]+$/

              if (value.length === 0 && [".", ","].includes(key)) {
                e.preventDefault()
              }

              if (
                !regex.test(key) &&
                !["Backspace", "ArrowLeft", "ArrowRight", "Delete", "Tab", "Enter", "Home", "End"].includes(key)
              ) {
                e.preventDefault()
              }
            }
          }}
          ref={e => {
            ref(e)
            inputRef.current = e // you can still assign to ref
          }}
          {...props}
        />
      )}
      {endIcon && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-icon-color">{endIcon}</div>}
      {errors[id] && errorMessage && (
        <motion.p className="font-secondary text-danger text-xs" initial={{ x: 0 }} animate={{ x: [0, -2, 2, 0] }}>
          {errorMessage}
        </motion.p>
      )}
    </div>
  )
}
