import { ReactNode, useEffect } from "react"
import { FieldErrors } from "react-hook-form"

import { IAuthFormData } from "../AuthModal/AuthModal"

export const useHideResponseMessage = (
  errors: FieldErrors<IAuthFormData>,
  displayResponseMessage: (message: ReactNode | null) => void,
) => {
  useEffect(() => {
    //hide response message to prevent overflow because too much errors
    if (errors.email || errors.password || errors.username) {
      displayResponseMessage(null)
    }
  }, [errors.email, errors.password, errors.username])
}
