"use client"

import {
  MAX_PRODUCT_DESCRIPTION_LENGTH,
  MAX_PRODUCT_TITLE_LENGTH,
  MIN_PRODUCT_DESCRIPTION_LENGTH,
  MIN_PRODUCT_TITLE_LENGTH,
} from "@/constants/productLimits"
import { useScopedI18n } from "@/locales/client"
import {
  PRODUCT_DESCRIPTION_INVALID_CHARACTER_REGEX,
  PRODUCT_DESCRIPTION_PATTERN,
  PRODUCT_TITLE_INVALID_CHARACTER_REGEX,
  PRODUCT_TITLE_HAS_LETTER_REGEX,
  PRODUCT_TITLE_MUST_START_REGEX,
  PRODUCT_TITLE_PATTERN,
  getInvalidCharacterDetails,
} from "@/utils/productValidation"
import { formatGroupedNumberInput } from "@/utils/numberFormatter"
import { motion } from "framer-motion"
import React, { useRef } from "react"
import { FieldErrors, UseFormRegister } from "react-hook-form"
import { twMerge } from "tailwind-merge"

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
      pattern: {
        value: PRODUCT_TITLE_PATTERN,
        message: t("title_required"),
      },
    },
    subTitle: {
      requiredMessage: t("this_field_is_required"),
      pattern: {
        value: PRODUCT_DESCRIPTION_PATTERN,
        message: t("subtitle_required"),
      },
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
            const str = String(value ?? "")
            if (!str || (patternValue && patternValue.test(str))) return true
            const invalidCharacterMessage = getInvalidCharacterMessage(id, str)
            if (invalidCharacterMessage) return invalidCharacterMessage
            if (str.length < MIN_PRODUCT_TITLE_LENGTH) return t("title_too_short")
            if (str.length > MAX_PRODUCT_TITLE_LENGTH)
              return t("title_too_long", { current: str.length, max: MAX_PRODUCT_TITLE_LENGTH })
            if (!PRODUCT_TITLE_HAS_LETTER_REGEX.test(str)) return t("title_must_contain_letter")
            if (!PRODUCT_TITLE_MUST_START_REGEX.test(str)) return t("title_must_start_alphanumeric")
            return patternMessage
          }
        : id === "subTitle"
          ? (value: string | number) => {
              const str = String(value ?? "")
              if (!str.trim()) return required ? t("this_field_is_required") : true
              if (str.trim().length < MIN_PRODUCT_DESCRIPTION_LENGTH) return t("description_too_short")
              if (str.length > MAX_PRODUCT_DESCRIPTION_LENGTH)
                return t("description_too_long", { max: MAX_PRODUCT_DESCRIPTION_LENGTH })
              if (patternValue?.test(str)) return true
              const invalidCharacterMessage = getInvalidCharacterMessage(id, str)
              if (invalidCharacterMessage) return invalidCharacterMessage
              return patternMessage
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
  const currentFieldValue = id === "subTitle" ? textareaRef.current?.value || "" : inputRef.current?.value || ""
  const fallbackErrorMessage = ["title", "subTitle"].includes(id) ? getInvalidCharacterMessage(id, currentFieldValue) : null
  const errorMessage = fallbackErrorMessage || (errors[id]?.message as React.ReactNode)

  return (
    <div className="relative">
      {startIcon && (
        <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-icon-color">{startIcon}</div>
      )}
      {id === "subTitle" ? (
        <textarea
          {...textareaRest}
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
          id={id}
          autoComplete={id}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={MAX_PRODUCT_DESCRIPTION_LENGTH}
          rows={6}
          ref={e => {
            textArea(e)
            textareaRef.current = e // you can still assign to ref issue
            //https://github.com/orgs/react-hook-form/discussions/11137
            if (externalTextareaRef) externalTextareaRef.current = e
          }}
        />
      ) : (
        <input
          {...rest}
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
