import { ModalContainer } from ".."

interface AreYouSureModalProps {
  isOpen: boolean
  onClose: () => void
  label: string
  children: React.ReactNode
}

export function AreYouSureModal({ isOpen, onClose, label, children }: AreYouSureModalProps) {
  return (
    <ModalContainer isOpen={isOpen} onClose={onClose}>
      <h1 className="text-2xl text-center mt-4">{label}</h1>
      {children}
    </ModalContainer>
  )
}
