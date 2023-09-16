import { MdOutlineDeleteOutline } from "react-icons/md"
import {HiOutlineRefresh} from 'react-icons/hi'
import {FaBitcoin,FaStripeS,FaPaypal} from 'react-icons/fa'

import { Button, ModalContainer } from ".."
import useUserCartStore from "../../../store/user/userCartStore"
import { formatCurrency } from "../../../utils/currencyFormatter"
import { useModals } from "../../../store/ui"
import { AreYouSureModal } from "."
import { Slider } from "../.."
import { IProduct } from "../../../interfaces/IProduct"
import { useEffect } from "react"

interface CartModalProps {
  isOpen: boolean
  onClose: () => void
  label: string
}

export function CartModal({ isOpen, onClose, label }: CartModalProps) {
  const userCartStore = useUserCartStore()
  const { isOpen: areYouSureIsOpen, closeModal, openModal } = useModals()

  const baseBackendURL = process.env.NODE_ENV === "production" ? "https://23-store.vercel.app" : "http://localhost:3000"


  const stripeProductsQuery = userCartStore.products
  .filter((product: IProduct) => product.on_stock > 0)
  .map((product: IProduct) => ({
    price: product.id,
    quantity: product.quantity,
  }))
  .map(item => `stripeProducts=${encodeURIComponent(JSON.stringify(item))}`)
  .join("&");

  const payPalProductsQuery = userCartStore.products
  .filter((product: IProduct) => product.on_stock > 0)
  .map((product: IProduct) => ({
    name:product.title,
    sku:product.id,
    price:product.price,
    quantity:product.quantity
  }))
  .map(item => `payPalProducts=${encodeURIComponent(JSON.stringify(item))}`)
  .join("&");


    useEffect(() => {
      const refreshOnStock = async () => {
        userCartStore.refreshProductOnStock(userCartStore.products)
      }
      refreshOnStock()
    },[])

  return (
    <>
      <ModalContainer
        className="w-screen h-screen laptop:max-w-[1024px] laptop:max-h-[640px] pt-8"
        isOpen={isOpen}
        onClose={onClose}>
        <div className="relative flex flex-col gap-y-8 pb-8 w-full h-full overflow-y-scroll">
          <h1 className="text-4xl text-center whitespace-nowrap mt-4">{label}</h1>
          {userCartStore.products.length > 0 ? (
            <div
              className="flex flex-col gap-y-4">
              <section className="flex flex-col gap-y-8 w-[90%] mx-auto">
                {userCartStore.products.map(product => (
                  <article className={`flex flex-col laptop:flex-row border-[1px] ${product.on_stock === 0 && 'border-warning'}`} key={product.id}>
                    {product.img_url.length === 1 ? (
                      <img
                        className="w-full tablet:aspect-video h-[200px] mobile:h-[250px] tablet:h-[400px] laptop:h-[200px]
                     laptop:w-fit object-cover"
                        src={product.img_url[0]}
                        alt={product.title}
                      />
                    ) : (
                      <Slider
                        images={product.img_url}
                        title={product.title}
                        className="w-full tablet:aspect-video h-[200px] mobile:h-[250px] tablet:h-[400px] tablet:w-full
                     laptop:h-[200px] desktop:h-[200px] laptop:w-fit"
                      />
                    )}
                    <div className="flex flex-col justify-between w-full">
                      <div className="flex flex-row gap-x-8 justify-between items-center p-4">
                        <div className="flex flex-col">
                          <h1 className={`text-2xl text-center truncate ${product.on_stock === 0 && 'text-subTitle'}`}>{product.title}</h1>
                          {product.on_stock === 0 && <p className="text-warning">Out of stock</p>}
                        </div>
                        <h1 className={`text-2xl text-center align-top h-full ${product.on_stock === 0 && 'text-subTitle'}`}>{formatCurrency(product.price)}</h1>
                      </div>
                      <div className="flex flex-col tablet:flex-row gap-y-4 gap-x-8 justify-between items-center p-4">
                        <div className="flex flex-col">
                          <h5 className="text-lg flex flex-row justify-center tablet:justify-start">
                            Quantity:&nbsp;<p>{product.quantity}</p>
                          </h5>
                          <h5 className="text-lg flex flex-row justify-center tablet:justify-start">
                            Sub-total:&nbsp;<p>{formatCurrency(product.quantity * product.price)}</p>
                          </h5>
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
                          {product.on_stock === 0 && 
                          <Button className="text-lg flex flex-row gap-x-2" variant='info-outline'>
                          <p className="flex tablet:hidden text-title">Request replenishment</p>
                        <HiOutlineRefresh/>
                          </Button>
                          }
                        </div>
                      
                      </div>
                    </div>
                  </article>
                ))}
              </section>

              <section className="flex flex-col gap-y-4 gap-x-4 justify-between items-center w-[90%] mx-auto px-4 laptop:px-0">
            
              <div className="flex flex-row gap-x-2 justify-between items-center w-full">
                <h1 className="text-2xl">
                  Total:&nbsp;
                  <span>
                    {formatCurrency(
                      userCartStore.products.reduce(
                        (totalPrice, product) => product.on_stock === 0 
                        ? totalPrice
                        : totalPrice + product.price * product.quantity,
                        0,
                      ),
                    )}
                  </span>
                </h1>
                <div className="flex flex-col mobile:flex-row gap-x-4 gap-y-4">
                  <Button
                    className="flex flex-row gap-x-1"
                    onClick={() => openModal("AreYouSureModal")}
                    variant="danger-outline">
                    Clear cart <MdOutlineDeleteOutline />
                  </Button>
                </div>
              </div>
                  
                  <div className="flex flex-row gap-x-4 justify-end items-center w-full">
                    <h1 className="text-2xl">Proceed to checkout</h1>
                    <div className="flex flex-row gap-x-2">
                       <form action={`${baseBackendURL}/payment`}>
                        <Button className="flex flex-row gap-x-1" variant="info" type="submit">
                          Bitcoin
                          <FaBitcoin/>
                        </Button>
                       </form>
                    <form action={`${baseBackendURL}/create-payment?${payPalProductsQuery}`}
                    method="POST">
                      <Button className="flex flex-row gap-x-1" variant="info" type="submit">
                      PayPal
                      <FaPaypal/>
                    </Button>
                    </form>
                    <form action={`${baseBackendURL}/create-checkout-session?${stripeProductsQuery}`}
                    method="POST">
                    <Button className="flex flex-row gap-x-1" variant="info" type="submit">
                      Stripe
                      <FaStripeS/>
                    </Button>
                    </form>
                    </div>
                  </div>
              </section>
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center">
              <img src="/empty-cart.png" alt="" />
              <h1 className="text-4xl">Cart is empty</h1>
            </div>
          )}
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
