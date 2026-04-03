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
  const MAX_TITLE_LENGTH = 158
  const TITLE_INVALID_CHARACTER_REGEX = /[^A-Za-z0-9#$()_+ /,.'-]/
  const TITLE_HAS_LETTER_REGEX = /[A-Za-z]/
  const TITLE_MUST_START_REGEX = /^[A-Za-z0-9]/

  const getInvalidCharacterContext = (value: string, invalidCharacterIndex: number) => {
    const wordsBeforeInvalidCharacter = value
      .slice(0, invalidCharacterIndex)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .join(" ")

    if (wordsBeforeInvalidCharacter) return wordsBeforeInvalidCharacter

    const wordsAfterInvalidCharacter = value
      .slice(invalidCharacterIndex + 1)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .join(" ")

    if (wordsAfterInvalidCharacter) return wordsAfterInvalidCharacter

    return value.slice(Math.max(0, invalidCharacterIndex - 6), Math.min(value.length, invalidCharacterIndex + 7)).trim()
  }

  const getReadableCharacter = (character: string) => {
    if (character === "\n") return "newline"
    if (character === "\t") return "tab"
    return character
  }

  const getInvalidCharacterMessage = (value: string) => {
    const invalidCharacterMatch = value.match(TITLE_INVALID_CHARACTER_REGEX)
    if (!invalidCharacterMatch || invalidCharacterMatch.index === undefined) return null

    const invalidCharacter = getReadableCharacter(invalidCharacterMatch[0])
    const context = getInvalidCharacterContext(value, invalidCharacterMatch.index)

    return t("title_invalid_character", {
      character: invalidCharacter,
      context,
    })
  }

  const validationRules: ValidationRules = {
    title: {
      requiredMessage: t("this_field_is_required"),
    },
    subTitle: {
      requiredMessage: t("this_field_is_required"),
      pattern: {
        value: /^[-:.,()#@&%\/"'`~\[\]><=+!?*_;a-zA-Z0-9\n ]{1,10000}$/,
        message: t("subtitle_required"),
      },
    },
    price: {
      requiredMessage: t("this_field_is_required"),
      pattern: {
        value: /^(?!0\.?$)[1-9][0-9]{0,5}(\.\d{1,2})?$/,
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
            const str = String(value ?? "")
            if (!str) return true
            const invalidCharMsg = getInvalidCharacterMessage(str)
            if (invalidCharMsg) return invalidCharMsg
            if (str.length < 3) return t("title_too_short")
            if (str.length > MAX_TITLE_LENGTH) return t("title_too_long", { current: str.length, max: MAX_TITLE_LENGTH })
            if (!TITLE_HAS_LETTER_REGEX.test(str)) return t("title_must_contain_letter")
            if (!TITLE_MUST_START_REGEX.test(str)) return t("title_must_start_alphanumeric")
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

              if (id === "price" && value.length === 0 && key === "0") {
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
      {errors[id] && errors[id]?.message && (
        <motion.p className="font-secondary text-danger text-xs" initial={{ x: 0 }} animate={{ x: [0, -2, 2, 0] }}>
          {errors[id]?.message as React.ReactNode}
        </motion.p>
      )}
    </div>
  )
}
