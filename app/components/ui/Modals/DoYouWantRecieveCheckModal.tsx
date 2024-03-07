"use client"

import { TWallet, useDoYouWantRecieveCheckModal } from "@/store/ui/doYouWantRecieveCheckModal"
import { ModalContainer } from "./ModalContainers"
import { FormInput } from "../Inputs/Validation"
import { useForm } from "react-hook-form"
import { Button } from ".."
import { TAPICoinmarketcapResponse } from "@/api/coinmarketcap/route"
import axios from "axios"
import useCartStore from "@/store/user/cartStore"
import { useRouter } from "next/navigation"
import useToast, { MessageStore } from "@/store/ui/useToast"
import { useLoading } from "@/store/ui/useLoading"
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

interface FormData {
  username: string
  email: string
  emailOrUsername?: string
  password: string
}

export const sendMoneyWithMetamask = async (
  productsPrice: number,
  wallet: TWallet,
  router: AppRouterInstance,
  toast: MessageStore,
  setIsLoading: (isLoading: boolean) => void,
) => {
  // TODO - now user may change abount of sending money and get no info about payment - send check and block way to change amount of sending money
  try {
    const response: TAPICoinmarketcapResponse = await axios.post(`${location.origin}/api/coinmarketcap`, {
      amount: productsPrice,
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
            value: BigInt(Math.floor(ETHPrice * 10 ** 18)).toString(16),
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
        setIsLoading(false)
      })
  } catch (error: any) {
    toast.show("error", "Failed to pay with metamask", error.message as string)
    setIsLoading(false)
  }
}

export function DoYouWantRecieveCheckModal() {
  const cartStore = useCartStore()
  const router = useRouter()
  const toast = useToast()
  const { setIsLoading } = useLoading()
  const { wallet, isOpen, openModal, closeModal } = useDoYouWantRecieveCheckModal()

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<FormData>()

  const onSubmit = (data: FormData) => {
    if (data.email.length === 0) {
      toast.show("error", "Please enter your email", "If you want to recieve check - please enter your email")
    } else {
      // TODO - use email to send email when I fix this issue - https://github.com/resend/react-email/issues/1150
      // Also I need to somehow get this success state after paying with metamask to send check
      // so when I will have money on my metamask it will be possible to test metamask transaction and send check
      toast.show(
        "error",
        "Check will be not sent",
        "react-email error - https://github.com/resend/react-email/issues/1150",
      )
      sendMoneyWithMetamask(cartStore.getProductsPrice(), wallet, router, toast, setIsLoading)
    }
  }

  return (
    <ModalContainer
      className="relative w-full max-w-[450px]"
      classnameContainer="z-[1701]"
      isOpen={isOpen}
      onClose={closeModal}>
      <h1 className="text-2xl">Do you want recieve check?</h1>
      <FormInput id="email" register={register} label="Email" errors={errors} placeholder="example@gmail.com" />
      <Button variant="success-outline" onClick={handleSubmit(onSubmit)}>
        Yes
      </Button>
      <Button
        variant="danger-outline"
        onClick={() => {
          sendMoneyWithMetamask(cartStore.getProductsPrice(), wallet, router, toast, setIsLoading)
          closeModal()
        }}>
        No
      </Button>
    </ModalContainer>
  )
}
