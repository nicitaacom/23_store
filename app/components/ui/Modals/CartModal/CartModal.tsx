"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { FaBitcoin, FaPaypal, FaStripeS } from "react-icons/fa"
import { MdOutlineDeleteOutline } from "react-icons/md"
import { HiOutlineRefresh } from "react-icons/hi"
import detectEthereumProvider from "@metamask/detect-provider"
import axios from "axios"

import { formatBalance } from "@/utils/formatMetamaskBalance"
import useUserStore from "@/store/user/userStore"
import useToast from "@/store/ui/useToast"
import useCartStore from "@/store/user/cartStore"
import EmptyCart from "./EmptyCart"
import { formatCurrency } from "@/utils/currencyFormatter"

//Are you sure in what - please use clear naming
import { Button, Slider } from "../.."
import { useAreYouSureClearCartModal } from "@/store/ui/areYouSureClearCartModal"
import { ModalQueryContainer } from "../../ModalQueryContainer"

interface CartModalProps {
  label: string
}

export function CartModal({ label }: CartModalProps) {
  const router = useRouter()
  const cartStore = useCartStore()
  const areYouSureClearCartModal = useAreYouSureClearCartModal()
  const toast = useToast()
  const { isAuthenticated } = useUserStore()

  if (!isAuthenticated) {
    router.push("/?modal=AuthModal&variant=login")
  }

  useEffect(() => {
    cartStore.fetchProductsData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const increaseProductQuantity = useCallback((id: string) => {
    cartStore.increaseProductQuantity(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const decreaseProductQuantity = useCallback((id: string) => {
    cartStore.decreaseProductQuantity(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const clearProductQuantity = useCallback((id: string) => {
    cartStore.clearProductQuantity(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* queries for payment */

  const stripeProductsQuery = cartStore.productsData
    .filter(product => product.on_stock > 0)
    .map(product => ({
      price: product.id,
      quantity: product.quantity,
    }))
    .map(item => `${encodeURIComponent(JSON.stringify(item))}`)
    .join("&")

  const payPalProductsQuery = cartStore.productsData
    .filter(product => product.on_stock > 0)
    .map(product => ({
      name: product.title,
      sku: product.id,
      price: product.price,
      quantity: product.quantity,
    }))
    .map(item => `payPalProducts=${encodeURIComponent(JSON.stringify(item))}`)
    .join("&")

  /* Metamask implementation */
  const [hasProvider, setHasProvider] = useState<boolean | null>(null)
  const initialState = { accounts: [], balance: "", chainId: "" }
  const [wallet, setWallet] = useState(initialState)
  const [ETHprice, setETHPrice] = useState(0)

  const [isConnecting, setIsConnecting] = useState(false)

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
      setWallet(wallet => ({ ...wallet, chainId }))
    }

    const getProvider = async () => {
      const provider = await detectEthereumProvider({ silent: true })
      setHasProvider(Boolean(provider))

      if (provider) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" })
        refreshAccounts(accounts)
        window.ethereum.on("accountsChanged", refreshAccounts)
        window.ethereum.on("chainChanged", refreshChain)
      }
    }

    getProvider()

    return () => {
      window.ethereum?.removeListener("accountsChanged", refreshAccounts)
      window.ethereum?.removeListener("chainChanged", refreshChain)
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateWallet = async (accounts: never[]) => {
    const balance = formatBalance(
      await window.ethereum!.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"],
      }),
    )
    const chainId = await window.ethereum!.request({
      method: "eth_chainId",
    })
    setWallet({ accounts, balance, chainId })
  }

  async function sendMoney() {
    setIsConnecting(true)

    try {
      const response = await axios.post(`${location.origin}/api/coinmarketcap`, {
        amount: cartStore.getProductsPrice(),
        symbol: "USD",
        convert: "ETH",
      })
      const ETHPrice = response.data.data[0].quote.ETH.price

      window.ethereum
        .request({
          method: "eth_sendTransaction",
          params: [
            {
              from: wallet.accounts[0],
              to: process.env.NEXT_PUBLIC_METAMASK_ADRESS,
              gasLimit: "0x5028",
              maxPriorityFeePerGas: "0x3b9aca00",
              maxFeePerGas: "0x2540be400",
              value: BigInt(ETHPrice * 10 ** 18).toString(16),
            },
          ],
        })
        .then((txHash: string) => {
          router.push(`${location.origin}/payment?status=success`)
          //TODO - add this txHash to query params when I check is payment with metamask is actually work
          console.log(169, "You may use txHash as check QR code or payment identifier - ", txHash)
        })
        .catch((error: Error) => {
          error.message.includes("MetaMask Tx Signature: User denied transaction signature.")
            ? toast.show("error", "Transaction error", "User denied transaction signature")
            : toast.show("error", "Unknown error", error.message)
        })
        .finally(() => setIsConnecting(false))
    } catch (error: any) {
      toast.show("error", "Failed to pay with metamask", error.message as string)
      setIsConnecting(false)
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)

    if (hasProvider === false) {
      setTimeout(() => {
        setIsConnecting(false)
      }, 10000)
      toast.show(
        "error",
        "Metamask not detected",
        <span className="inline">
          Please install metamask&nbsp;
          <Button
            className="inline w-fit text-info"
            variant="link"
            active="active"
            target="_blank"
            href="https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?utm_source=ext_app_menu">
            here{" "}
          </Button>
          or using&nbsp;
          <Button
            className="inline w-fit text-info"
            variant="link"
            active="active"
            target="_blank"
            href={`${location.origin}/docs/customer/how-to-install-metamask`}>
            this
          </Button>{" "}
          guide
        </span>,
        10000,
      )
      throw Error("Metamask not detected")
    }

    await window.ethereum.request({
      method: "eth_requestAccounts",
    })
    setIsConnecting(false)
  }

  /* Stripe implementation */

  async function createCheckoutSession() {
    if (cartStore.getProductsPrice() > 999999) {
      return toast.show(
        "error",
        "Stripe restrictions",
        <p>
          Stripe limits you to make purchase over 1M$
          <br /> Delete products in cart total be less $1,000,000
        </p>,
        10000,
      )
    }
    const response = await axios.post("/api/create-checkout-session", { stripeProductsQuery })
    //redirect user to session.url on client side to avoid 'blocked by CORS' error
    router.push(response.data)
  }

  return (
    <ModalQueryContainer
      className="w-screen h-screen laptop:max-w-[1024px] laptop:max-h-[640px] pt-8"
      modalQuery="CartModal">
      <div className="relative flex flex-col gap-y-8 pb-8 w-full h-full overflow-y-scroll">
        <h1 className="text-4xl text-center whitespace-nowrap mt-4">{label}</h1>
        {cartStore.productsData.length > 0 ? (
          <div className="flex flex-col gap-y-4">
            <section className="flex flex-col gap-y-8 w-[90%] mx-auto">
              {cartStore.productsData.map(productData => {
                return (
                  <article
                    className={`relative flex flex-col tablet:flex-row border-[1px] pb-2 tablet:pb-0 overflow-hidden ${
                      productData.on_stock === 0 ? "border-warning" : ""
                    }`}
                    key={productData.id}>
                    {productData.img_url.length === 1 ? (
                      <figure>
                        <Image
                          // aspect-video doesn't work - so I write width and height manually
                          className="w-full h-[300px]
                          tablet:w-[clamp(16.6875rem,0rem+34.7656vw,22.25rem)] tablet:h-[clamp(9.375rem,0rem+19.5313vw,12.5rem)] 
                          laptop:w-[356px] laptop:h-[200px]
                          object-cover"
                          src={productData.img_url[0]}
                          alt="image"
                          width={480}
                          height={360}
                          priority
                        />
                      </figure>
                    ) : (
                      <Slider
                        //for 768-1024px aspect-ratio 16:9 from 150px hegiht till 356px
                        className="h-[300px]
                        tablet:w-[clamp(16.6875rem,0rem+34.7656vw,22.25rem)] tablet:h-[clamp(9.375rem,0rem+19.5313vw,12.5rem)] 
                        laptop:w-[356px] laptop:h-[200px]
                        object-cover"
                        containerClassName="
                        tablet:w-[clamp(16.6875rem,0rem+34.7656vw,22.25rem)] tablet:h-[clamp(9.375rem,0rem+19.5313vw,12.5rem)] 
                        laptop:w-[356px] laptop:h-[200px]
                        desktop:h-[200px] desktop:w-[356px]
                        object-cover"
                        images={productData.img_url}
                        title={productData.title}
                      />
                    )}
                    {/* width of div with title and price is 100% - image width */}
                    <div
                      className="relative tablet:w-[calc(100%-clamp(16.6875rem,0rem+34.7656vw,22.25rem))] tablet:laptop:w-[calc(100%-356px)]
                     flex flex-col justify-between gap-y-4 px-2 py-1 tablet:pb-2">
                      {/* HEADER - Title + price */}
                      <header className="flex flex-col mobile:flex-row justify-between">
                        <div className="flex flex-col w-full mobile:w-[60%]">
                          <h1
                            className={`text-2xl text-center mobile:text-start truncate
                          ${productData.on_stock === 0 ? "text-subTitle" : ""}`}>
                            {productData.title}
                          </h1>
                          {productData.on_stock === 0 && <p className="text-warning">Out of stock</p>}
                        </div>
                        <h1
                          className={`text-2xl text-center mobile:text-end align-top h-full mobile:w-[40%]
                        ${productData.on_stock === 0 ? "text-subTitle" : ""}`}>
                          {formatCurrency(productData.price)}
                        </h1>
                      </header>
                      <footer className="flex flex-col gap-y-2 tablet:flex-row gap-x-8 justify-between">
                        {/* FOOTER LEFT - quantity + sub-total */}
                        <div className="flex flex-col items-center tablet:items-start">
                          <h5 className="flex flex-row text-center">
                            Quantity:&nbsp;<p>{productData.quantity}</p>
                          </h5>
                          <h5 className="flex flex-row">
                            Sub-total:&nbsp;<p>{formatCurrency(productData.quantity * productData.price)}</p>
                          </h5>
                        </div>

                        {/* FOOTER RIGHT - buttons */}
                        <div className="flex flex-row gap-x-2 justify-center tablet:justify-end max-h-[48px]">
                          {productData.on_stock > 0 && (
                            <>
                              <Button
                                className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl"
                                variant="success-outline"
                                onClick={() => increaseProductQuantity(productData.id)}>
                                +
                              </Button>
                              <Button
                                className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl"
                                variant="danger-outline"
                                onClick={() => decreaseProductQuantity(productData.id)}>
                                -
                              </Button>
                            </>
                          )}
                          <Button
                            className="font-secondary font-thin max-h-[48px]"
                            variant="danger-outline"
                            onClick={() => clearProductQuantity(productData.id)}>
                            <p className="hidden laptop:flex font-bold">Clear</p>
                            <MdOutlineDeleteOutline />
                          </Button>
                          {productData.on_stock === 0 && (
                            <Button className="text-lg flex flex-row gap-x-2" variant="info-outline">
                              <HiOutlineRefresh />
                            </Button>
                          )}
                        </div>
                      </footer>
                    </div>
                  </article>
                )
              })}
              <footer className="flex flex-col min-[600px]:flex-row gap-8 justify-between">
                <div className="flex flex-col gap-y-2">
                  <h1 className="text-2xl text-center min-[600px]:text-start">
                    Total:&nbsp;
                    <span>{formatCurrency(cartStore.getProductsPrice())}</span>
                  </h1>
                  <Button variant="danger" onClick={areYouSureClearCartModal.openModal}>
                    Clear cart
                  </Button>
                </div>
                <div className="grid gap-2 grid-cols-2">
                  <Button
                    className="flex flex-row gap-x-1 w-full laptop:w-full"
                    variant="info"
                    disabled={isConnecting}
                    onClick={wallet.chainId ? sendMoney : handleConnect}>
                    Metamask
                    <Image className="w-[20px] h-[20px]" width={32} height={32} src="/metamask.png" alt="metamask" />
                  </Button>
                  <div className="tooltip h-[40px]">
                    <Button className="flex flex-row gap-x-1 w-full laptop:w-full" variant="info">
                      Bitcoin
                      <FaBitcoin />
                      <div className="tooltiptext bg-background whitespace-nowrap">I need ca 100$ to create it</div>
                    </Button>
                  </div>
                  <Button className="flex flex-row gap-x-1 w-full laptop:w-full" variant="info">
                    PayPal
                    <FaPaypal />
                  </Button>
                  <Button
                    className="flex flex-row gap-x-1 w-full laptop:w-full"
                    variant="info"
                    onClick={createCheckoutSession}>
                    Stripe
                    <FaStripeS />
                  </Button>
                </div>
              </footer>
            </section>
          </div>
        ) : (
          <EmptyCart />
        )}
      </div>
    </ModalQueryContainer>
  )
}
