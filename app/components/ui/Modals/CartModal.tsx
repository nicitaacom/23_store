import { OpenAreYouSureModalButton } from "@/components/Navbar/components"
import { ModalContainer } from "../ModalContainer"

interface CartModalProps {
  label: string
}

export function CartModal({ label }: CartModalProps) {
  return (
    <ModalContainer className="w-[500px] h-[600px]" modalQuery="CartModal">
      <div className="flex flex-col gap-y-2">
        <h1>{label}</h1>
        <div>
          <OpenAreYouSureModalButton />
        </div>
      </div>
    </ModalContainer>
  )
}
