"use client"

import { useScopedI18n } from "@/locales/client"
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
  onInput,
  ...props
}: InputFormProps) {
  const t = useScopedI18n("product")
  const MAX_DESCRIPTION_LENGTH = 2200
  const DESCRIPTION_INVALID_CHARACTER_REGEX = /[!$^*_=\\]/

  const containsOnlyPrintableText = (value: string, allowNewlines = false) => {
    const normalizedValue = allowNewlines ? value.replace(/\r?\n/g, "") : value
    return !/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}]/u.test(normalizedValue)
  }

  const getInvalidCharacterContext = (value: string, invalidCharacterIndex: number) => {
    const wordsBeforeInvalidCharacter = value
      .slice(0, invalidCharacterIndex)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)

    const invalidCharacter = value[invalidCharacterIndex] || ""
    const contextParts = [...wordsBeforeInvalidCharacter, invalidCharacter].filter(Boolean)

    if (contextParts.length > 0) {
      return contextParts.join(" ")
    }

    const wordsAfterInvalidCharacter = value
      .slice(invalidCharacterIndex + 1)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)

    if (wordsAfterInvalidCharacter.length > 0) {
      return [invalidCharacter, ...wordsAfterInvalidCharacter].join(" ")
    }

    return invalidCharacter
  }

  const getReadableCharacter = (character: string) => {
    if (character === "\n") return "newline"
    if (character === "\t") return "tab"
    return character
  }

  const getInvalidCharacterMessage = (value: string, invalidCharacterRegex: RegExp, key: "title_invalid_character" | "description_invalid_character") => {
    const invalidCharacterMatch = value.match(invalidCharacterRegex)
    if (!invalidCharacterMatch || invalidCharacterMatch.index === undefined) return null

    const invalidCharacter = getReadableCharacter(invalidCharacterMatch[0])
    const context = getInvalidCharacterContext(value, invalidCharacterMatch.index)

    return t(key, { character: invalidCharacter, context })
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

  const {
    requiredMessage: requiredMessage,
    pattern,
  } = validationRules[id]

  const registerOptions = {
    required: required ? requiredMessage : undefined,
    pattern: pattern
      ? {
          value: pattern.value,
          message: pattern.message,
        }
      : undefined,
    validate:
      id === "title"
        ? (value: string | number) => {
            const str = String(value ?? "").trim()
            if (!str) return t("this_field_is_required")
            if (str.length < 2) return t("title_too_short")
            if (!containsOnlyPrintableText(str)) return t("title_printable_only")
            const invalidCharacterMessage = getInvalidCharacterMessage(str, /[^\p{L}\p{N}\p{P}\p{Zs}]/u, "title_invalid_character")
            if (invalidCharacterMessage) return invalidCharacterMessage
            return true
          }
        : id === "subTitle"
          ? (value: string | number) => {
              const str = String(value ?? "")
              if (!str.trim()) return t("this_field_is_required")
              if (str.trim().length < 10) return t("description_too_short")
              if (str.length > MAX_DESCRIPTION_LENGTH) return t("description_too_long", { max: MAX_DESCRIPTION_LENGTH })
              if (!containsOnlyPrintableText(str, true)) return t("description_printable_only")
              const invalidCharacterMessage = getInvalidCharacterMessage(
                str,
                DESCRIPTION_INVALID_CHARACTER_REGEX,
                "description_invalid_character",
              )
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
  const currentFieldValue = id === "subTitle" ? textareaRef.current?.value || "" : inputRef.current?.value || ""
  const fallbackErrorMessage =
    id === "subTitle"
      ? getInvalidCharacterMessage(currentFieldValue, DESCRIPTION_INVALID_CHARACTER_REGEX, "description_invalid_character")
      : id === "title"
        ? getInvalidCharacterMessage(currentFieldValue, /[^\p{L}\p{N}\p{P}\p{Zs}]/u, "title_invalid_character")
        : null
  const errorMessage = fallbackErrorMessage || (errors[id]?.message as React.ReactNode)

  return (
    <div className={`relative`}>
      <div className="absolute top-[50%] translate-y-[-50%] translate-x-[50%]">{startIcon}</div>
      {id === "subTitle" ? (
        <textarea
          {...textareaRest}
          className={twMerge(
            `w-full rounded-[22px] bg-transparent text-white outline-none transition-all duration-200 placeholder:text-white/42
            focus:border-brand/60 focus:bg-[#151a21] focus:shadow-[inset_0_0_0_1px_rgba(32,233,89,0.18)]`,
            startIcon && "pl-10",
            endIcon && "pr-10",
            errors[id] &&
              errors[id]?.message &&
              "border-danger/70 focus:border-danger/70 focus:shadow-[inset_0_0_0_1px_hsl(var(--danger)/0.28)] focus-visible:outline-none",
            disabled && "opacity-50 cursor-default pointer-events-none",
            className,
          )}
          id={id}
          autoComplete={id}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={id === "subTitle" ? MAX_DESCRIPTION_LENGTH : props.maxLength}
          rows={6}
          ref={e => {
            textArea(e)
            textareaRef.current = e // you can still assign to ref issue
            //https://github.com/orgs/react-hook-form/discussions/11137
          }}
        />
      ) : (
        <input
          {...rest}
          className={twMerge(
            `w-full rounded-[22px] bg-transparent text-white outline-none transition-all duration-200 placeholder:text-white/42
            focus:border-brand/60 focus:bg-[#151a21] focus:shadow-[inset_0_0_0_1px_rgba(32,233,89,0.18)]`,
            startIcon && "pl-10",
            endIcon && "pr-10",
            errors[id] &&
              errors[id]?.message &&
              "border-danger/70 focus:border-danger/70 focus:shadow-[inset_0_0_0_1px_hsl(var(--danger)/0.28)] focus-visible:outline-none",
            disabled && "opacity-50 cursor-default pointer-events-none",
            className,
          )}
          id={id}
          type={type}
          autoComplete={id}
          placeholder={placeholder}
          disabled={disabled}
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
      <div className="absolute top-[50%] right-2 translate-y-[-50%] translate-x-[50%]">{endIcon}</div>
      {errors[id] && errorMessage && (
        <motion.p className="font-secondary text-danger text-xs" initial={{ x: 0 }} animate={{ x: [0, -2, 2, 0] }}>
          {errorMessage}
        </motion.p>
      )}
    </div>
  )
}
