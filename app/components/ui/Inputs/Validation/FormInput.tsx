import { FieldErrors, UseFormRegister } from "react-hook-form"
import { twMerge } from "tailwind-merge"

import { BaseInput } from "../BaseInput"

interface FormData {
  username: string
  email: string
  emailOrUsername?: string
  password: string
}

interface FormInputProps {
  id: keyof FormData
  type?: string
  className?: string
  label: string
  placeholder?: string
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  register: UseFormRegister<FormData>
  errors: FieldErrors
  disabled?: boolean
  required?: boolean
  validationMessages?: {
    required?: string
    pattern?: string
  }
}

interface ValidationRules {
  [key: string]: {
    required: string
    pattern: {
      value: RegExp
      message: string
    }
  }
}

// http://localhost:6006/?path=/story/ui-inputs-baseinput--states
export function FormInput({
  className = "",
  label,
  id,
  type = "text",
  startIcon,
  endIcon,
  placeholder = "",
  required,
  register,
  errors,
  disabled = false,
  validationMessages,
}: FormInputProps) {
  const validationRules: ValidationRules = {
    username: {
      required: "This field is required",
      pattern: {
        value: /^(?=.*[a-z])[a-z][a-z0-9]{2,15}$/i,
        message: "3-16 characters, a-z, start with letter, numbers optional",
      },
    },
    email: {
      required: "This field is required",
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: "Enter valid email address",
      },
    },
    emailOrUsername: {
      required: "This field is required",
      pattern: {
        value: /^(?=.*[a-z])[a-zA-Z0-9@.]{2,}$/i,
        message: "Enter valid username or email",
      },
    },
    password: {
      required: "This field is required",
      pattern: {
        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[a-zA-Z0-9_\-%#$]{8,64}$/,
        message: "Must contain a-z A-Z 0-9 and _-%#$ are optional - between 8-64 symbols",
      },
    },
  }

  const {
    required: requiredMessage,
    pattern: { value: patternValue, message: patternMessage },
  } = validationRules[id]

  return (
    <div>
      <label className="block text-sm font-medium leading-6" htmlFor={id}>
        {label}
        <div className="flex flex-col gap-1">
          <div className="relative">
            {startIcon && <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-icon-color">{startIcon}</div>}
            {endIcon && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-icon-color">{endIcon}</div>}
            <BaseInput
              className={twMerge(
                startIcon && "pl-8",
                endIcon && "pr-8",
                errors[id] && "focus:ring-rose-500 focus-visible:outline-rose-600",
                disabled && "opacity-50 cursor-default pointer-events-none",
                className,
              )}
              id={id}
              type={type}
              placeholder={placeholder}
              autoComplete={id === "password" ? "current-password" : id}
              disabled={disabled}
              {...register(id, {
                required: required ? validationMessages?.required || requiredMessage : undefined,
                pattern: {
                  value: patternValue,
                  message: validationMessages?.pattern || patternMessage,
                },
              })}
            />
          </div>
          {errors[id] && errors[id]?.message && (
            <span className="text-xs text-danger">{errors[id]?.message as React.ReactNode}</span>
          )}
        </div>
      </label>
    </div>
  )
}
