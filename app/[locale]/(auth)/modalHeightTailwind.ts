import { FieldErrors } from "react-hook-form"
import { twMerge } from "tailwind-merge"
import { AuthFormData } from "./AuthModal/AuthModal"

export const modalHeightTailwind = (queryParams: string | null, errors: FieldErrors<AuthFormData>) => {
  return twMerge(
    queryParams === "login"
      ? "h-[560px]"
      : queryParams === "register"
        ? "h-[640px]"
        : queryParams === "resetPassword"
          ? "h-[310px]"
          : "h-[290px]",

    //for login height when errors x1
    queryParams === "login" && (errors.email || errors.password) && "!h-[570px]",
    //for login height when errors x2
    queryParams === "login" && errors.password && errors.email && "!h-[590px]",

    //for register height when errors
    queryParams === "register" && (errors.email || errors.password || errors.username) && "!h-[660px]",
    //for register height when errors x2
    queryParams === "register" && errors.email && errors.password && "!h-[680px]",
    //for register height when errors x3
    queryParams === "register" && errors.email && errors.password && errors.username && "!h-[700px]",

    //for recover height when errors
    queryParams === "recover" && errors.email && "!h-[320px]",

    //for resetPassword height when errors
    queryParams === "resetPassword" && errors.password && "!h-[390px]",

    //for auth completed height
    queryParams === "authCompleted" && "!h-[250px]",
  )
}
