"use client"

import { useScopedI18n } from "@/locales/client"
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
    pattern: {
      value: RegExp
      message: string
    }
  }
}

export function ProductInput({
  className = "",
  id,
  type = "text",
  required,
  register,
  startIcon,
  endIcon,
  errors,
  placeholder,
  disabled,
  ...props
}: InputFormProps) {
  const t = useScopedI18n("product")
  const validationRules: ValidationRules = {
    title: {
      requiredMessage: t("this_field_is_required"),
      pattern: {
        value: /^(?=.*[A-Za-z])[A-Za-z][A-Za-z0-9$()_+ /-]{2,48}$/,
        message: t("title_required"),
      },
    },
    subTitle: {
      requiredMessage: t("this_field_is_required"),
      pattern: {
        value: /^[-:.,()#@&%\/"'`~\[\]a-zA-Z0-9\n ]{1,10000}$/,
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
        value: /^(?!0)[0-9.]{1,5}$/,
        message: t("on_stock_required"),
      },
    },
  }

  const {
    requiredMessage: requiredMessage,
    pattern: { value: patternValue, message: patternMessage },
  } = validationRules[id]

  const { ref, ...rest } = {
    ...register(id, {
      required: required ? requiredMessage : undefined,
      pattern: {
        value: patternValue,
        message: patternMessage,
      },
    }),
  }
  const { ref: textArea, ...textareaRest } = {
    ...register(id, {
      required: required ? requiredMessage : undefined,
      pattern: {
        value: patternValue,
        message: patternMessage,
      },
    }),
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
            `rounded bg-transparent outline-none text-title`,
            startIcon && "pl-10",
            endIcon && "pr-10",
            errors[id] && errors[id]?.message && "focus:ring-danger focus-visible:outline-danger focus:outline-offset-0",
            disabled && "opacity-50 cursor-default pointer-events-none",
            className,
          )}
          id={id}
          autoComplete={id}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus
          {...register("subTitle", {
            required: required ? requiredMessage : undefined,
            pattern: {
              value: patternValue,
              message: patternMessage,
            },
          })}
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
            `rounded bg-transparent outline-none text-title`,
            startIcon && "pl-10",
            endIcon && "pr-10",
            errors[id] && errors[id]?.message && "focus:ring-danger focus-visible:outline-danger focus:outline-offset-0",
            disabled && "opacity-50 cursor-default pointer-events-none",
            className,
          )}
          id={id}
          type={type}
          autoComplete={id}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus
          {...register(id, {
            required: required ? requiredMessage : undefined,
            pattern: {
              value: patternValue,
              message: patternMessage,
            },
          })}
          onKeyDown={e => {
            if (type === "numeric") {
              const { key, target } = e
              const { value } = target as HTMLInputElement
              const regex = /^(?!\..)[0-9.]+$/

              if (value.length === 0 && [".", "0"].includes(key)) {
                e.preventDefault()
              }

              if (!regex.test(key) && !["Backspace", "ArrowLeft", "ArrowRight", "Delete", "Tab", "Enter"].includes(key)) {
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
