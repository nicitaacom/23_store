import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { clusterApiUrl, Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"
import { Buffer } from "buffer"

import { TRecordCartProduct } from "@/ts/product/TRecordCartProduct"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"

const SOLANA_MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
const SOLANA_CLUSTERS = ["devnet", "testnet", "mainnet-beta"] as const

export async function sendMoneyWithSolana(
  products: TRecordCartProduct,
  senderAddress: string,
  router: AppRouterInstance,
  t: TI18nFunction,
) {
  const toast = useToast.getState()
  const { setIsLoading } = useLoading.getState()

  try {
    const createWalletPaymentIntentResp = await productsSDK.createWalletPaymentIntent({
      network: "SOL",
      senderAddress,
      products: Object.values(products).map(product => ({
        productId: product.id,
        variantId: product.variantId ?? null,
        quantity: product.quantity,
      })),
    })
    const cluster = SOLANA_CLUSTERS.find(clusterName => clusterName === createWalletPaymentIntentResp.solanaCluster) ?? "devnet"
    const connection = new Connection(clusterApiUrl(cluster), "confirmed")
    const lamports = Number(BigInt(createWalletPaymentIntentResp.tokenUnits))
    if (!Number.isSafeInteger(lamports) || lamports < 1) throw new Error("The Solana payment amount is invalid")

    const senderPublicKey = new PublicKey(senderAddress)
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")
    const transaction = new Transaction({ feePayer: senderPublicKey, blockhash, lastValidBlockHeight }).add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: new PublicKey(createWalletPaymentIntentResp.recipient),
        lamports,
      }),
      new TransactionInstruction({
        keys: [],
        programId: new PublicKey(SOLANA_MEMO_PROGRAM_ID),
        data: Buffer.from(createWalletPaymentIntentResp.intentId, "utf8"),
      }),
    )

    const { signature } = await window.solana.signAndSendTransaction(transaction)
    const confirmation = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed")
    if (confirmation.value.err) {
      throw new Error(`The Solana transfer failed confirmation: ${JSON.stringify(confirmation.value.err)}`)
    }

    const verification = await productsSDK.verifyWalletPayment({ intentId: createWalletPaymentIntentResp.intentId, transactionHash: signature })
    if (!verification.valid) throw new Error("The store could not confirm the Solana transfer")
    router.push(`${location.origin}/payment?status=success`)
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
