import { ModalContainer } from ".."
import useUserCartStore from "../../../store/user/userCartStore"

interface CartModalProps {
  isOpen: boolean
  onClose: () => void
  label: string
}

export function CartModal({ isOpen, onClose, label }: CartModalProps) {
  const userCartStore = useUserCartStore()

  return (
    <ModalContainer className="w-[90vw]" isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col justify-center items-center w-[90%] mx-auto">
        <h1 className="text-4xl text-center whitespace-nowrap mb-8">{label}</h1>
        <div className="flex flex-col gap-y-4 w-full">
          {userCartStore.products.map(product => (
            <article className="flex flex-col border-b-[1px]">
              <img className="h-[175px] object-cover" src={product.img_url} alt={product.title} />
              <div className="flex flex-col">
                <div className="flex flex-row justify-between items-center">
                  <h1 className="text-2xl text-center truncate">{product.title}</h1>
                  <h1 className="text-2xl text-center">{product.price}</h1>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </ModalContainer>
  )
}
