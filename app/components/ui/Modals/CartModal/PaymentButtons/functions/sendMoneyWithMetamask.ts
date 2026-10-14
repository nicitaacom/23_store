import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

import { TRecordCartProduct } from "@/ts/product/TRecordCartProduct"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { TWallet } from "@/ts/types/TWallet"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"

type TEvmNetwork = "ETH" | "BNB" | "MATIC"

const NETWORKS_BY_CHAIN_ID: Record<string, TEvmNetwork> = {
  "0x1": "ETH",
  "0x38": "BNB",
  "0x89": "MATIC",
}

export async function sendMoneyWithMetamask(
  products: TRecordCartProduct,
  wallet: TWallet,
  router: AppRouterInstance,
  t: TI18nFunction,
  selectedNetwork: TEvmNetwork,
) {
  const toast = useToast.getState()
  const { setIsLoading } = useLoading.getState()

  try {
    const chainId = (await window.ethereum.request({ method: "eth_chainId" })) as string
    if (NETWORKS_BY_CHAIN_ID[chainId.toLowerCase()] !== selectedNetwork) {
      toast.show("error", t("payment.error.unsupported_network_title"), t("payment.error.unsupported_network_subtitle"))
      setIsLoading(false)
      return
    }
    const senderAddress = wallet.accounts[0]
    if (!senderAddress) throw new Error("Connect a wallet account before starting payment")

    const createWalletPaymentIntentResp = await productsSDK.createWalletPaymentIntent({
      network: selectedNetwork,
      senderAddress,
      products: Object.values(products).map(product => ({
        productId: product.id,
        variantId: product.variantId ?? null,
        quantity: product.quantity,
      })),
    })
    if (createWalletPaymentIntentResp.chainId?.toLowerCase() !== chainId.toLowerCase()) {
      throw new Error("The wallet network changed before payment started. Select the same network and try again.")
    }

    const transactionHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: senderAddress,
          to: createWalletPaymentIntentResp.recipient,
          value: `0x${BigInt(createWalletPaymentIntentResp.tokenUnits).toString(16)}`,
          data: createWalletPaymentIntentResp.transactionData,
        },
      ],
    })
    if (typeof transactionHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      throw new Error("The wallet did not return a transaction reference, so the transfer could not be verified")
    }

    const verification = await productsSDK.verifyWalletPayment({ intentId: createWalletPaymentIntentResp.intentId, transactionHash })
    if (!verification.valid) throw new Error("The store could not confirm the wallet transfer")
    router.push(`${location.origin}/payment?status=success`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("MetaMask Tx Signature: User denied the transaction signature.")) {
      toast.show("error", t("payment.error.transaction_title"), t("payment.error.transaction_subtitle"))
    } else {
      toast.show("error", t("payment.error.transaction_failed_title"), message)
    }
    setIsLoading(false)
  }
}
