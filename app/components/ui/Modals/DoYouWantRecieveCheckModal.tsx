"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { useDoYouWantRecieveCheckModal } from "@/store/ui/doYouWantRecieveCheckModal"
import { ModalContainer } from "./ModalContainers"
import { FormInput } from "../Inputs/Validation"
import useCartStore from "@/store/user/cartStore"
import { sendMoneyWithMetamask } from "./CartModal/PaymentButtons/functions/sendMoneyWithMetamask"
import { Button } from ".."
import useToast from "@/store/ui/useToast"
import { useLoading } from "@/store/ui/useLoading"

interface FormData {
  username: string
  email: string
  emailOrUsername?: string
  password: string
}

export function DoYouWantRecieveCheckModal() {
  const cartStore = useCartStore()
  const router = useRouter()
  const toast = useToast()
  const { setIsLoading } = useLoading()
  const { wallet, isOpen, recipientAddress, openModal, closeModal } = useDoYouWantRecieveCheckModal()

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<FormData>()

  const onSubmit = (data: FormData) => {
    if (!recipientAddress)
      toast.show("error", "No recipient address", "Make sure recipient address exist (contact support)")
    else if (data.email.length === 0) {
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
      sendMoneyWithMetamask(cartStore.getProductsPrice(), wallet, router, recipientAddress)
    }
  }

  return (
    <ModalContainer
      className="relative w-full max-w-[450px]"
      classnameContainer="z-[1701]"
      isOpen={isOpen}
      onClose={closeModal}>
      <h1 className="text-2xl">Do you want recieve check?</h1>
      <p>Note that this is BTC address - send from BTC to BTC - otherwise you loose crypto</p>
      <FormInput id="email" register={register} label="Email" errors={errors} placeholder="example@gmail.com" />
      <Button variant="success-outline" onClick={handleSubmit(onSubmit)}>
        Yes
      </Button>
      <Button
        variant="danger-outline"
        onClick={() => {
          if (!recipientAddress) return console.log(212, "No recipient address")
          sendMoneyWithMetamask(cartStore.getProductsPrice(), wallet, router, recipientAddress)
          closeModal()
        }}>
        No
      </Button>
    </ModalContainer>
  )
}
