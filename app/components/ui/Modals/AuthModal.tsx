import { ModalContainer } from "../ModalContainer"

interface AuthModalProps {
  label: string
}

export function AuthModal({ label }: AuthModalProps) {
  return (
    <ModalContainer className="w-[500px] h-[600px]" modalQuery="AuthModal">
      <div className="flex flex-col gap-y-2">
        <h1>{label}</h1>
        <div className="flex flex-col gap-y-4">
          <p>Content for auth modal</p>
          <p>Also work if already exist query params like http://localhost:3000/about?search=nike&modal=AuthModal</p>
        </div>
      </div>
    </ModalContainer>
  )
}
