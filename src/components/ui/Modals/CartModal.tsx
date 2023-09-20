import { useEffect, useState } from "react"

import { MdOutlineDeleteOutline } from "react-icons/md"
import {HiOutlineRefresh} from 'react-icons/hi'
import {FaBitcoin,FaStripeS,FaPaypal} from 'react-icons/fa'
import detectEthereumProvider from "@metamask/detect-provider"

import { IProduct } from "../../../interfaces/IProduct"
import { baseBackendURL, baseURL } from "../../../utils/baseURL"
import { Button, ModalContainer } from ".."
import useUserCartStore from "../../../store/user/userCartStore"
import { formatCurrency } from "../../../utils/currencyFormatter"
import { useModals, useToast } from "../../../store/ui"
import { AreYouSureModal } from "."
import { Slider } from "../.."
import { formatBalance, formatChainAsNum } from '../../../utils/formatMetamaskBalance'
import axios from "axios"
import { useNavigate } from "react-router"

interface CartModalProps {
  isOpen: boolean
  onClose: () => void
  label: string
}

export function CartModal({ isOpen, onClose, label }: CartModalProps) {
  const userCartStore = useUserCartStore()
  const { isOpen: areYouSureIsOpen, closeModal, openModal } = useModals()
  const toast = useToast()
  const navigate = useNavigate()




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

const convertUSDToETHQuery = userCartStore.products
  .filter((product: IProduct) => product.on_stock > 0)
  .map((product: IProduct) => ({
    price: product.price,
    quantity: product.quantity
  }))
  .map(item => `amount=${encodeURIComponent(item.price * item.quantity)}`)
  .join('&');



    useEffect(() => {
      const refreshOnStock = async () => {
        userCartStore.refreshProductOnStock(userCartStore.products)
      }
      refreshOnStock()
      //eslint-disable-next-line react-hooks/exhaustive-deps
    },[])






/* Metamask implementation */
  const [hasProvider, setHasProvider] = useState<boolean | null>(null)
  const initialState = { accounts: [], balance: "", chainId: "" }
  const [wallet, setWallet] = useState(initialState)
  const [ETHprice,setETHPrice] = useState<number>(0)

  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const refreshAccounts = (accounts: never[]) => {
      if (accounts.length > 0) {
        updateWallet(accounts)
      } else {
        // if length 0, user is disconnected
        setWallet(initialState)
      }
    }

    const refreshChain = (chainId: string) => {
      setWallet((wallet) => ({ ...wallet, chainId }))
    }

    const getProvider = async () => {
      const provider = await detectEthereumProvider({ silent: true })
      setHasProvider(Boolean(provider))

      if (provider) {
        const accounts = await window.ethereum.request(
          { method: 'eth_accounts' }
        )
        refreshAccounts(accounts)
        window.ethereum.on('accountsChanged', refreshAccounts)
        window.ethereum.on("chainChanged", refreshChain)
      }
    }

    getProvider()

    return () => {
      window.ethereum?.removeListener('accountsChanged', refreshAccounts)
      window.ethereum?.removeListener("chainChanged", refreshChain)
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateWallet = async (accounts: never[]) => {
    const balance = formatBalance(await window.ethereum!.request({
      method: "eth_getBalance",
      params: [accounts[0], "latest"],
    }))
    const chainId = await window.ethereum!.request({
      method: "eth_chainId",
    })
    setWallet({ accounts, balance, chainId })
    
  }

  async function sendMoney() {
        setIsConnecting(true)

       
          try {
            const response = await axios.get(
              `${baseBackendURL}/coinmarketcap?${convertUSDToETHQuery}&symbol=USD&convert=ETH`
            );
            console.log(140,'response -', response);
            console.log(141,'response.data.data[0].quote.ETH.price -', response.data.data[0].quote.ETH.price);
            setETHPrice(response.data.data[0].quote.ETH.price)
            console.log(142,"ETHPrice - ",ETHprice)
            const weiPrice = ((ETHprice * 10 ** 16)).toString();
            console.log(144,"weiPrice - ",weiPrice);

          } catch (error) {
            console.log('Error -', error);
          }
        


        window.ethereum
        .request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: wallet.accounts[0],
              to: import.meta.env.VITE_METAMASK_ADRESS,
              gasLimit: '0x5028',
              maxPriorityFeePerGas: '0x3b9aca00',
              maxFeePerGas: '0x2540be400',
              value:(BigInt(ETHprice * 10 ** 18)).toString(16)
            },
          ],
        })
        .then((txHash:string) => {navigate(`${baseURL}/payment?status=success`),console.log("txHash - ",txHash)})
        .catch((error:Error) => {
          
        error.message.includes("MetaMask Tx Signature: User denied transaction signature.")
        ? toast.show('error','Transaction error','User denied transaction signature')
        : toast.show('error','Unknown error',error.message)
          }).finally(() => setIsConnecting(false))
}

  const handleConnect = async () => {
    setIsConnecting(true)

    if (hasProvider === false) {
      setTimeout(() => {
        setIsConnecting(false)
      },10000)
      toast.show('error','Metamask not detected',
      <span className="inline">Please install metamask&nbsp;
         <Button className="inline w-fit text-info" variant='link' active='active' target="_blank"
         href="https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?utm_source=ext_app_menu">here </Button>
         or using&nbsp;<Button className="inline w-fit text-info" variant='link' active='active' target="_blank"
          href={`${baseURL}/docs/customer/how-to-install-metamask`}>this</Button> guide
      </span>,10000)
      throw Error("Metamask not detected")
    }

    await window.ethereum.request({
      method: "eth_requestAccounts",
    })
    .then((accounts:[]) => {
      setError(false)
      updateWallet(accounts)
    })
    .catch((err:Error) => {
      setError(true)
      setErrorMessage(err.message)
    })
    setIsConnecting(false)
  }

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
                    <div className="flex flex-col justify-between w-full laptop:max-w-[calc(100%-355.55px)]">
                      <div className="flex flex-col mobile:flex-row gap-y-2 gap-x-8 justify-between items-center p-4 max-w-full">
                        <div className="flex flex-col w-full mobile:w-[60%]">
                          <h1 className={`text-2xl text-center mobile:text-start truncate ${product.on_stock === 0 && 'text-subTitle'}`}>{product.title}</h1>
                          {product.on_stock === 0 && <p className="text-warning">Out of stock</p>}
                        </div>
                        <h1 className={`text-2xl text-end align-top h-full mobile:w-[40%] ${product.on_stock === 0 && 'text-subTitle'}`}>{formatCurrency(product.price)}</h1>
                      </div>
                      <div className="flex flex-col tablet:flex-row gap-y-4 gap-x-8 justify-between items-center p-4 max-w-full">
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

                
            
              <div className="flex flex-col mobile:flex-row gap-y-2 gap-x-2 justify-between items-center w-full">
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
                <div className="flex flex-row gap-x-4 w-full mobile:w-fit">
                  <Button
                    className="flex flex-row gap-x-1 w-full"
                    onClick={() => openModal("AreYouSureModal")}
                    variant="danger-outline">
                    Clear cart <MdOutlineDeleteOutline />
                  </Button>
                </div>
              </div>
                  
                  <h1 className="text-2xl">Proceed to checkout</h1>
                  <div className="grid grid-cols-2 gap-4 laptop:flex flex-row">
                  




                  
                    <div>Injected Provider {hasProvider ? 'DOES' : 'DOES NOT'} Exist</div>

      {window.ethereum?.isMetaMask && wallet.accounts.length < 1 &&
        <button disabled={isConnecting} onClick={handleConnect}>Connect MetaMask</button>
      }

      {wallet.accounts.length > 0 &&
        <div className="flex flex-col gap-y-2">
          <div>Wallet Accounts: {wallet.accounts[0]}</div>
          <div>Wallet Balance: {wallet.balance}</div>
          <div>Hex ChainId: {wallet.chainId}</div>
          <div>Numeric ChainId: {formatChainAsNum(wallet.chainId)}</div>
        </div>
      }
      { error && (
          <div onClick={() => setError(false)}>
            <strong>Error:</strong> {errorMessage}
          </div>
        )
      }





                    <div>
                    <Button className="flex flex-row gap-x-1 w-full laptop:w-fit" variant="info"
                    disabled={isConnecting} onClick={wallet ? sendMoney : handleConnect}>
                      Metamask 
                      <img className="w-[20px] h-[20px]" width={32} height={32} src="/metamask.png" alt="metamask" />
                    </Button>
                    </div>
                    <div className="tooltip h-[40px]">
                    <Button className="flex flex-row gap-x-1 w-full laptop:w-fit" variant="info" type="submit">
                      Bitcoin
                      <FaBitcoin/>
                    </Button>
                    <div className="tooltiptext bg-background whitespace-nowrap">I need ca 50$ to create it</div>
                    </div>
                   <form action={`${baseBackendURL}/create-payment?${payPalProductsQuery}`}
                    method="POST">
                      <Button className="flex flex-row gap-x-1 w-full laptop:w-fit" variant="info" type="submit">
                      PayPal
                      <FaPaypal/>
                    </Button>
                    </form>
                    <form action={`${baseBackendURL}/create-checkout-session?${stripeProductsQuery}`}
                    method="POST">
                    <Button className="flex flex-row gap-x-1 w-full laptop:w-fit" variant="info" type="submit">
                      Stripe
                      <FaStripeS/>
                    </Button>
                    </form>
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
