"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { sendMoneyWithMetamask } from "./CartModal/PaymentButtons/functions/sendMoneyWithMetamask"
import { Button } from ".."
import { FormInput } from "../Inputs/Validation"
import { ModalContainer } from "./ModalContainers"
import useCartStore from "@/store/user/cartStore"
import { useDoYouWantRecieveCheckModal } from "@/store/ui/useDoYouWantRecieveCheckModal"
import { useI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"

interface FormData {
  username: string
  email: string
  emailOrUsername?: string
  password: string
}

export function DoYouWantReceiveCheckModal() {
  const t = useI18n()
  const cartStore = useCartStore()
  const router = useRouter()
  const toast = useToast()
  const { wallet, isOpen, recipientAddress, closeModal } = useDoYouWantRecieveCheckModal()

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<FormData>()

  const onSubmit = (data: FormData) => {
    if (!recipientAddress) toast.show("error", "No recipient address", "Make sure recipient address exist (contact support)")
    else if (data.email.length === 0) {
      toast.show("error", "Please enter your email", "If you want to recieve check - please enter your email")
    } else {
      // TODO - use email to send email when I fix this issue - https://github.com/resend/react-email/issues/1150
      // Also I need to somehow get this success state after paying with metamask to send check
      // so when I will have money on my metamask it will be possible to test metamask transaction and send check
      toast.show("error", "Check will be not sent", "react-email error - https://github.com/resend/react-email/issues/1150")
      sendMoneyWithMetamask(cartStore.getProductsPrice(), wallet, router, recipientAddress, t)
    }
  }

  return (
    <ModalContainer className="relative w-full max-w-[450px]" classnameContainer="z-[1701]" isOpen={isOpen} onClose={closeModal}>
      <h1 className="text-2xl">{t("modal.do_you_want_receive_check.title")}</h1>
      <FormInput
        id="email"
        register={register}
        label={t("modal.do_you_want_receive_check.email_placeholder")}
        errors={errors}
        placeholder="example@gmail.com"
      />
      <Button variant="success-outline" onClick={handleSubmit(onSubmit)}>
        {t("modal.yes")}
      </Button>
      <Button
        variant="danger-outline"
        onClick={() => {
          if (!recipientAddress) return console.log(64, "No recipient address")
          sendMoneyWithMetamask(cartStore.getProductsPrice(), wallet, router, recipientAddress, t)
          closeModal()
        }}>
        {t("modal.no")}
      </Button>
    </ModalContainer>
  )
}
