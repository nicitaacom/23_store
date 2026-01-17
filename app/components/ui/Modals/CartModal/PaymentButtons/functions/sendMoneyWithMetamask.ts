import { TWallet } from "@/store/ui/doYouWantRecieveCheckModal"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"
import {
  Connection as SolanaConnection,
  PublicKey,
  Transaction as SolanaTransaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Keypair,
} from "@solana/web3.js"
import axios, { AxiosResponse } from "axios"
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

export const sendMoneyWithMetamask = async (
  productsPrice: number,
  wallet: TWallet,
  router: AppRouterInstance,
  recipientAddress: string,
) => {
  const toast = useToast.getState()
  const { setIsLoading } = useLoading.getState()

  try {
    // 1. check the current network
    const chainId = await window.ethereum.request({ method: "eth_chainId" })

    // 2. define relevant chain IDs and their corresponding tokens
    const ETH_MAINNET = "0x1"
    const POLYGON = "0x89"
    const BNB_SMART_CHAIN = "0x38"
    const SOLANA = "0x1"

    let chainToken: string

    // 3. determine the appropriate chainToken based on the chainId
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

    // 4. proceed to get price conversion for the specific token
    const response: AxiosResponse<API.CoinmarketcapResponse> = await axios.post(
      `${location.origin}/api/coinmarketcap`,
      {
        amount: productsPrice,
        symbol: "USD",
        convert: chainToken,
      } as API.CoinmarketcapRequest,
    )

    // 5. check if the token price is available
    const tokenPrice = response.data.data[0].quote[chainToken]?.price
    if (!tokenPrice) {
      toast.show("error", "Failed to retrieve token price", "Please try again later.")
      setIsLoading(false)
      return
    }

    // 6. amount to send in the respective token's smallest unit
    const amountInTokenUnits = BigInt(Math.round(tokenPrice * 10 ** 18))

    if (chainToken === "SOL") {
      // 7. create a Solana connection
      const solanaConnection = new SolanaConnection("https://api.mainnet-beta.solana.com", "confirmed")

      // 8. ensure wallet.secret exists and is of correct type
      if (!wallet.secret) {
        toast.show(
          "error",
          "Wallet secret not available",
          "Failed to sign the transaction because the secret key is missing.",
        )
        setIsLoading(false)
        return
      }

      // 9. use the secret key for the signer
      const sender = Keypair.fromSecretKey(Uint8Array.from(wallet.secret))

      const solanaTransaction = new SolanaTransaction().add(
        SystemProgram.transfer({
          fromPubkey: sender.publicKey,
          toPubkey: new PublicKey(recipientAddress),
          lamports: Number(amountInTokenUnits) / 10 ** 9,
        }),
      )

      // 10. send transaction using the Solana wallet
      const signature = await sendAndConfirmTransaction(solanaConnection, solanaTransaction, [sender])

      console.log("Transaction successful with signature:", signature)
      router.push(`${location.origin}/payment?status=success`)
    } else {
      // 11. for Ethereum, BNB Smart Chain, and Polygon
      const amountInWeiHex = amountInTokenUnits.toString(16).padStart(64, "0")

      console.log("Sending transaction with params:", {
        from: wallet.accounts[0],
        to: recipientAddress,
        value: `0x${amountInWeiHex}`,
      })

      window.ethereum
        .request({
          method: "eth_sendTransaction",
          params: [
            {
              from: wallet.accounts[0],
              to: recipientAddress,
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
