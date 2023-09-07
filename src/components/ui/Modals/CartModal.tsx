import { MdOutlineDeleteOutline } from "react-icons/md"
import { Button, ModalContainer } from ".."
import useUserCartStore from "../../../store/user/userCartStore"
import { formatCurrency } from "../../../utils/currencyFormatter"
import { useModals } from "../../../store/ui"
import { AreYouSureModal } from "."

interface CartModalProps {
  isOpen: boolean
  onClose: () => void
  label: string
}

export function CartModal({ isOpen, onClose, label }: CartModalProps) {
  const userCartStore = useUserCartStore()
  const { isOpen: areYouSureIsOpen, closeModal, openModal } = useModals()

  return (
    <>
      <ModalContainer
        className="w-screen h-screen laptop:max-w-[768px] laptop:max-h-[480px] overflow-y-scroll"
        isOpen={isOpen}
        onClose={onClose}>
        <div className="flex flex-col gap-y-8 justify-center items-center mb-8 laptop:w-[90%] laptop:mx-auto">
          <h1 className="text-4xl text-center whitespace-nowrap mt-4">{label}</h1>
          <section className="flex flex-col gap-y-8 w-full">
            {userCartStore.products.map(product => (
              <article className="flex flex-col laptop:flex-row border-[1px]" key={product.id}>
                <img
                  className="h-[225px] mobile:h-[275px] tablet:h-[350px] laptop:h-[150px] object-cover"
                  src={product.img_url}
                  alt={product.title}
                />
                <div className="flex flex-col justify-between w-full">
                  <div className="flex flex-row gap-x-8 justify-between items-center p-4">
                    <h1 className="text-2xl text-center truncate">{product.title}</h1>
                    <h1 className="text-2xl text-center">{formatCurrency(product.price)}</h1>
                  </div>
                  <div className="flex flex-col tablet:flex-row gap-y-4 gap-x-8 justify-between items-center p-4">
                    <div className="flex flex-col">
                      <h1 className="text-lg flex flex-row justify-center tablet:justify-start">
                        Quantity:&nbsp;<p>{product.quantity}</p>
                      </h1>
                      <h1 className="text-lg flex flex-row justify-center tablet:justify-start">
                        Sub-total:&nbsp;<p>{formatCurrency(product.quantity * product.price)}</p>
                      </h1>
                    </div>
                    <div className="flex flex-row gap-x-2 justify-end max-h-[42px]">
                      <Button
                        className="w-[46px] h-[42px] text-2xl"
                        variant="danger-outline"
                        onClick={() => userCartStore.decreaseProductQuantity(product)}>
                        -
                      </Button>
                      <Button
                        className="w-[46px] h-[42px] text-2xl"
                        variant="success-outline"
                        onClick={() => userCartStore.increaseProductQuantity(product)}>
                        +
                      </Button>
                      <Button
                        className="flex flex-row gap-x-1"
                        variant="danger-outline"
                        onClick={() => userCartStore.setProductQuantity0(product)}>
                        Clear <MdOutlineDeleteOutline />
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
          <section className="flex flex-col tablet:flex-row gap-y-4 gap-x-4 justify-between items-center w-full px-4 laptop:px-0">
            <h1 className="text-2xl flex flex-row">
              Total:&nbsp;<p>{formatCurrency(userCartStore.totalPrice())}</p>
            </h1>
            <div className="flex flex-col mobile:flex-row gap-x-4 gap-y-4">
              <Button
                className="flex flex-row gap-x-1"
                onClick={() => openModal("AreYouSureModal")}
                variant="danger-outline">
                Clear cart <MdOutlineDeleteOutline />
              </Button>
              <Button variant="info">Proceed to checkout</Button>
            </div>
          </section>
        </div>
      </ModalContainer>

      {/* ARE YOU SURE MODAL */}
      <AreYouSureModal
        isOpen={areYouSureIsOpen["AreYouSureModal"]}
        onClose={() => closeModal("AreYouSureModal")}
        label="Are you sure?">
        <div className="flex flex-col gap-y-4 justify-center items-center p-6">
          <section className="flex flex-col justify-center items-center">
            <h1 className="text-center">Are you sure you want clear the cart?</h1>
            <p className="text-warning text-center">This is irreversible - and delete all items in cart!</p>
          </section>
          <section className="flex flex-row gap-x-2">
            <Button variant="info-outline" onClick={() => closeModal("AreYouSureModal")}>
              Back
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                userCartStore.setCartQuantity0,
                  closeModal("AreYouSureModal"),
                  closeModal("CartModal"),
                  document.body.removeAttribute("style")
              }}>
              Clear cart
            </Button>
          </section>
        </div>
      </AreYouSureModal>
    </>
  )
}
