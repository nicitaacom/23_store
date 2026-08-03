"use client"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { sendMoneyWithSolana } from "../functions/sendMoneyWithSolana"
import useCartStore from "@/store/user/cartStore"
import { useI18n, useScopedI18n } from "@/locales/client"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"
import { Button } from "@/components/ui/Button"
import { trackBuyingFlowEvent } from "@/utils/trackBuyingFlowEvent"

// Solana is not an EVM chain - this is a base58 public key, not a 0x address
const SOLANA_ADDRESS = process.env.NEXT_PUBLIC_SOLANA_ADDRESS

const SOLANA_CONFIG = {
  name: "Solana",
  icon: "/solana.png",
  bg: "bg-[#9945FF]",
  hover: "hover:bg-[#7d37d6]",
  text: "text-white",
} as const

// http://localhost:6006/?path=/story/commerce-checkout--cart
export function PayWithSolanaButton() {
  const toast = useToast()
  const st = useScopedI18n("payment")
  const t = useI18n()
  const router = useRouter()
  const cartStore = useCartStore()
  const { isLoading, setIsLoading } = useLoading()

  const handlePayWithSolana = async () => {
    trackBuyingFlowEvent({ event: "checkout_click", checkoutKind: "solana" })
    setIsLoading(true)

    // 1. the extension has to be installed before it can sign anything - read it at click time,
    // so installing it and coming back works without a page reload
    if (!window.solana?.isPhantom) {
      toast.show(
        "error",
        st("error.phantom_not_detected"),
        <span className="inline">
          {st("error.please_install_phantom")}&nbsp;
          <Button
            className="inline w-fit text-info"
            variant="link"
            active="active"
            target="_blank"
            href="https://phantom.com/download">
            {st("error.here")}
          </Button>
          <br />
          {st("error.or_enable_phantom")}
          <Button
            className="inline w-fit text-info"
            onClick={() => window.location.reload()}
            variant="link"
            active="active"
            target="_blank">
            {st("error.reload_page")}&nbsp;
          </Button>
        </span>,
        10000,
      )
      setIsLoading(false)
      return
    }

    // 2. validate address exists
    if (!SOLANA_ADDRESS || !SOLANA_ADDRESS.trim()) {
      toast.show(
        "error",
        st("error.configuration_title"),
        st("error.configuration_subtitle", { selectedChain: SOLANA_CONFIG.name }),
      )
      setIsLoading(false)
      return
    }

    const trimmedAddress = SOLANA_ADDRESS.trim()

    // 3. validate base58 address format (no 0x prefix, and 0/O/I/l are left out of the alphabet)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmedAddress)) {
      toast.show(
        "error",
        st("error.invalid_address_format_title"),
        st("error.invalid_address_format_subtitle", { trimmedAddressLength: trimmedAddress.length, trimmedAddress }),
      )
      setIsLoading(false)
      return
    }

    try {
      // 4. connect and pay in the same click - the button says Solana, so it pays with Solana.
      // An already trusted wallet resolves without showing a second prompt
      const connectResp = await window.solana.connect()
      await sendMoneyWithSolana(cartStore.getProductsPrice(), connectResp.publicKey.toBase58(), router, trimmedAddress, t)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(st("error.sending_money_with_solana"), error)

      if (errorMessage.includes("User rejected the request")) {
        toast.show(
          "error",
          st("error.you_rejected_connection"),
          <p>
            {st("error.please_connect_one_more_time")}
            <br /> {st("error.this_time_dont_cancel_request")}
          </p>,
        )
      } else {
        toast.show("error", t("payment.error.transaction_failed_title"), errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      className={`w-full group relative overflow-hidden ${SOLANA_CONFIG.bg} ${SOLANA_CONFIG.hover} ${SOLANA_CONFIG.text}
      border-0 font-semibold shadow-lg hover:shadow-xl transition-all`}
      size="lg"
      rounded="lg"
      disabled={isLoading}
      onClick={handlePayWithSolana}
      rightIcon={
        <Image
          className="w-6 h-6 group-hover:scale-110 transition-transform"
          width={32}
          height={32}
          src={SOLANA_CONFIG.icon}
          alt={SOLANA_CONFIG.name}
        />
      }>
      {SOLANA_CONFIG.name}
    </Button>
  )
}
