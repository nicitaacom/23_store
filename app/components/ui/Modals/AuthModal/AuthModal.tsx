import { ModalContainer } from "../../ModalContainer"
import { LoginButton } from "./components"

interface AuthModalProps {
  label: string
}

export function AuthModal({ label }: AuthModalProps) {
  return (
    <ModalContainer modalQuery="AuthModal">
      <div className="flex flex-col gap-y-2">
        <h1>{label}</h1>
        <LoginButton />
      </div>
    </ModalContainer>
  )
}
