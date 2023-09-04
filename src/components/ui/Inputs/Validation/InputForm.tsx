import { motion } from "framer-motion"
import { FieldErrors, UseFormRegister } from "react-hook-form"

interface FormData {
  username: string
  email: string
  emailOrUsername: string
  password: string
}

interface InputFormProps {
  id: keyof FormData
  className?: string
  type?: string
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

export function InputForm({
  className = "",
  id,
  type,
  required,
  register,
  startIcon,
  errors,
  placeholder,
  disabled,
}: InputFormProps) {
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
      />
      {errors[id] && errors[id]?.message && (
        <motion.p className="font-secondary text-danger text-xs" initial={{ x: 0 }} animate={{ x: [0, -2, 2, 0] }}>
          {errors[id]?.message as React.ReactNode}
        </motion.p>
      )}
    </div>
  )
}
