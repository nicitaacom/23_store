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
import useToast from "@/store/ui/useToast"
import { useLoading } from "@/store/ui/useLoading"
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import {
  Connection as SolanaConnection,
  PublicKey,
  Transaction as SolanaTransaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Connection,
  Transaction,
  Keypair,
} from "@solana/web3.js"

interface FormData {
  username: string
  email: string
  emailOrUsername?: string
  password: string
}

const getPublicKey = (wallet: TWallet) => new PublicKey(wallet.accounts[0])

export const sendMoneyWithMetamask = async (
  productsPrice: number,
  wallet: TWallet,
  router: AppRouterInstance,
  setIsLoading: (isLoading: boolean) => void,
) => {
  const toast = useToast.getState()
  setIsLoading(true)

  try {
    // Check the current network
    const chainId = await window.ethereum.request({ method: "eth_chainId" })

    // Define relevant chain IDs and their corresponding tokens
    const ETH_MAINNET = "0x1" // Ethereum Mainnet
    const POLYGON = "0x89" // Polygon
    const BNB_SMART_CHAIN = "0x38" // Binance Smart Chain Mainnet
    const SOLANA = "0x1" // Solana (Placeholder)

    let chainToken: string

    // Determine the appropriate chainToken based on the chainId
    switch (chainId) {
      case ETH_MAINNET:
        chainToken = "ETH"
        break
      case POLYGON:
        chainToken = "MATIC"
        break
      case BNB_SMART_CHAIN:
        chainToken = "BNB"
        break
      case SOLANA:
        chainToken = "SOL"
        break
      default:
        toast.show(
          "error",
          "Unsupported network",
          "Please switch to Ethereum Mainnet, Polygon, BNB Smart Chain, or Solana.",
        )
        setIsLoading(false)
        return
    }

    // Proceed to get price conversion for the specific token
    const response: TAPICoinmarketcapResponse = await axios.post(`${location.origin}/api/coinmarketcap`, {
      amount: productsPrice,
      symbol: "USD",
      convert: chainToken,
    })

    // Check if the token price is available
    const tokenPrice = response.data.data[0].quote[chainToken]?.price
    if (!tokenPrice) {
      toast.show("error", "Failed to retrieve token price", "Please try again later.")
      setIsLoading(false)
      return
    }

    // Amount to send in the respective token's smallest unit
    const amountInTokenUnits = BigInt(Math.round(tokenPrice * 10 ** 18)) // For ETH/BSC/POLYGON, adjust later for SOL

    if (chainToken === "SOL") {
      // Create a Solana connection
      const solanaConnection = new SolanaConnection("https://api.mainnet-beta.solana.com", "confirmed")

      // Ensure wallet.secret exists and is of correct type
      if (!wallet.secret) {
        toast.show(
          "error",
          "Wallet secret not available",
          "Failed to sign the transaction because the secret key is missing.",
        )
        setIsLoading(false)
        return
      }

      // Use the secret key for the signer
      const sender = Keypair.fromSecretKey(Uint8Array.from(wallet.secret))

      const solanaTransaction = new SolanaTransaction().add(
        SystemProgram.transfer({
          fromPubkey: sender.publicKey,
          toPubkey: new PublicKey(process.env.NEXT_PUBLIC_METAMASK_ADRESS),
          lamports: Number(amountInTokenUnits) / 10 ** 9,
        }),
      )

      // Send transaction using the Solana wallet
      const signature = await sendAndConfirmTransaction(solanaConnection, solanaTransaction, [sender])

      console.log("Transaction successful with signature:", signature)
      router.push(`${location.origin}/payment?status=success`)
    } else {
      // For Ethereum, BNB Smart Chain, and Polygon
      const amountInWeiHex = amountInTokenUnits.toString(16).padStart(64, "0")

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
              value: `0x${amountInWeiHex}`,
            },
          ],
        })
        .then((txHash: string) => {
          router.push(`${location.origin}/payment?status=success`)
          console.log("You may use txHash as check QR code or payment identifier - ", txHash)
        })
        .catch((error: Error) => {
          if (error.message.includes("MetaMask Tx Signature: User denied transaction signature.")) {
            toast.show("error", "Transaction error", "User denied transaction signature")
          } else {
            toast.show("error", "Unknown error", error.message)
          }
          setIsLoading(false)
        })
    }
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
      sendMoneyWithMetamask(cartStore.getProductsPrice(), wallet, router, setIsLoading)
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
          sendMoneyWithMetamask(cartStore.getProductsPrice(), wallet, router, setIsLoading)
          closeModal()
        }}>
        No
      </Button>
    </ModalContainer>
  )
}
