import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"

// Solana is not an EVM chain, so it has no chain id to switch on - the cluster is picked by env var instead
const SOLANA_CLUSTERS = ["devnet", "testnet", "mainnet-beta"] as const

export async function sendMoneyWithSolana(
  productsPrice: number,
  senderAddress: string,
  router: AppRouterInstance,
  recipientAddress: string,
  t: TI18nFunction,
) {
  const toast = useToast.getState()
  const { setIsLoading } = useLoading.getState()

  try {
    // 1. price the cart in SOL through the same CoinMarketCap quote ETH/BNB/MATIC use
    const getCoinmarketcapQuoteResp = await productsSDK.getCoinmarketcapQuote({
      amount: productsPrice,
      symbol: "USD",
      convert: "SOL",
    })

    // 2. check if the SOL amount is available
    const amountInSol = getCoinmarketcapQuoteResp.data[0].quote.SOL?.price
    if (!amountInSol) {
      toast.show(
        "error",
        t("payment.error.failed_to_retrieve_token_price_title"),
        t("payment.error.failed_to_retrieve_token_price_subtitle"),
      )
      setIsLoading(false)
      return
    }

    // 3. amount to send in lamports - SOL's smallest unit, 1 SOL = 10^9 lamports
    const lamports = Math.round(amountInSol * LAMPORTS_PER_SOL)

    // 4. open the public cluster endpoint, devnet until the env var names another cluster
    const cluster = SOLANA_CLUSTERS.find(clusterName => clusterName === process.env.NEXT_PUBLIC_SOLANA_CLUSTER) ?? "devnet"
    const connection = new Connection(clusterApiUrl(cluster), "confirmed")

    // 5. build the transfer - the connected wallet is both the sender and the fee payer
    const senderPublicKey = new PublicKey(senderAddress)
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")
    const transaction = new Transaction({ feePayer: senderPublicKey, blockhash, lastValidBlockHeight }).add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: new PublicKey(recipientAddress),
        lamports,
      }),
    )

    // 6. the wallet extension signs and sends it - its secret key never leaves the extension
    const { signature } = await window.solana.signAndSendTransaction(transaction)

    // 7. wait until the cluster confirms the transfer
    const confirmTransactionResp = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    )
    if (confirmTransactionResp.value.err) {
      toast.show("error", t("payment.error.transaction_failed_title"), String(confirmTransactionResp.value.err))
      setIsLoading(false)
      return
    }

    router.push(`${location.origin}/payment?status=success`)
    console.log("You may use signature as check QR code or payment identifier - ", signature)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes("User rejected the request")) {
      toast.show("error", t("payment.error.transaction_title"), t("payment.error.transaction_subtitle"))
    } else {
      toast.show("error", t("payment.error.transaction_failed_title"), errorMessage)
    }
    setIsLoading(false)
  }
}
