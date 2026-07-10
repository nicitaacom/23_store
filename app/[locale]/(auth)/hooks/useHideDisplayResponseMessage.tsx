import { ReactNode, useEffect } from "react"
import { FieldErrors } from "react-hook-form"

import { IAuthFormData } from "@/ts/interfaces/IAuthFormData"

export const useHideResponseMessage = (
  errors: FieldErrors<IAuthFormData>,
  displayResponseMessage: (message: ReactNode | null) => void,
) => {
  useEffect(() => {
    //hide response message to prevent overflow because too much errors
    if (errors.email || errors.password || errors.username) {
      displayResponseMessage(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- displayResponseMessage isn't memoized by the caller; including it would re-run this on every render
  }, [errors.email, errors.password, errors.username])
}
