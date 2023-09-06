import { motion } from "framer-motion"
import { FieldErrors, UseFormRegister } from "react-hook-form"

interface FormData {
  title: string
  subTitle: string
  price: number
  onStock: number
}

interface InputFormProps {
  id: keyof FormData
  className?: string
  type?: string | "numeric"
  required?: boolean
  register: UseFormRegister<FormData>
  startIcon?: React.ReactElement
  errors: FieldErrors
  placeholder: string
  disabled?: boolean
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

export function InputProduct({
  className = "",
  id,
  type = "text",
  required,
  register,
  startIcon,
  errors,
  placeholder,
  disabled,
}: InputFormProps) {
  const validationRules: ValidationRules = {
    title: {
      required: "This field is required",
      pattern: {
        value: /^(?=.*[A-Za-z])[A-Za-z][A-Za-z0-9$()_+ -]{2,48}$/,
        message: "Enter a product title - a-z - numbers, and #()_ are optional",
      },
    },
    subTitle: {
      required: "This field is required",
      pattern: {
        value: /^[-()#a-zA-Z0-9 ]{0,600}$/,
        message: "Enter description 0-600 symbols",
      },
    },
    price: {
      required: "This field is required",
      pattern: {
        value: /^(?!0\.?$)[1-9][0-9]{0,5}(\.\d{1,2})?$/,
        message: "Enter price from 1 to 999,999 with 2 decimal places",
      },
    },
    onStock: {
      required: "This field is required",
      pattern: {
        value: /^(?!0)[0-9.]{1,5}$/,
        message: "Enter how much products on stock - 1 - 99,999",
      },
    },
  }

  const {
    required: requiredMessage,
    pattern: { value: patternValue, message: patternMessage },
  } = validationRules[id]

  return (
    <div className={`relative`}>
      <div className="absolute top-[50%] translate-y-[-50%] translate-x-[50%]">{startIcon}</div>
      <input
        className={`w-full rounded border-[1px] border-solid bg-transparent px-4 py-2 mb-1 outline-none 
            ${startIcon && "pl-10"}
            ${errors[id] && "focus:ring-danger focus-visible:outline-danger focus:outline-offset-0"}
            ${disabled && "opacity-50 cursor-default"}
            ${className}`}
        id={id}
        type={type}
        autoComplete={id}
        placeholder={placeholder}
        disabled={disabled}
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
      />
      {errors[id] && errors[id]?.message && (
        <motion.p className="font-secondary text-danger text-xs" initial={{ x: 0 }} animate={{ x: [0, -2, 2, 0] }}>
          {errors[id]?.message as React.ReactNode}
        </motion.p>
      )}
    </div>
  )
}
