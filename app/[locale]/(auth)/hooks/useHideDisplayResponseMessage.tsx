import { ReactNode, useEffect } from "react"
import { FieldErrors } from "react-hook-form"
import { AuthFormData } from "../AuthModal/AuthModal"

export const useHideResponseMessage = (
  errors: FieldErrors<AuthFormData>,
  displayResponseMessage: (message: ReactNode) => void,
) => {
  useEffect(() => {
    //hide response message to prevent overflow because too much errors
    if (errors.email || errors.password || errors.username) {
      displayResponseMessage(<p></p>)
    }
  }, [errors.email, errors.password, errors.username])
}
