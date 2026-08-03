import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { TWallet } from "@/ts/types/TWallet"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"

export async function sendMoneyWithMetamask(
  productsPrice: number,
  wallet: TWallet,
  router: AppRouterInstance,
  recipientAddress: string,
  t: TI18nFunction,
) {
  const toast = useToast.getState()
  const { setIsLoading } = useLoading.getState()

  try {
    // 1. check the current network
    const chainId = (await window.ethereum.request({ method: "eth_chainId" })) as string

    // 2. define relevant chain IDs and their corresponding tokens
    const ETH_MAINNET = "0x1"
    const POLYGON = "0x89"
    const BNB_SMART_CHAIN = "0x38"

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
      default:
        toast.show("error", t("payment.error.unsupported_network_title"), t("payment.error.unsupported_network_subtitle"))
        setIsLoading(false)
        return
    }

    // 4. proceed to get price conversion for the specific token
    const getCoinmarketcapQuoteResp = await productsSDK.getCoinmarketcapQuote({
      amount: productsPrice,
      symbol: "USD",
      convert: chainToken,
    })

    // 5. check if the token price is available
    const tokenPrice = getCoinmarketcapQuoteResp.data[0].quote[chainToken]?.price
    if (!tokenPrice) {
      toast.show(
        "error",
        t("payment.error.failed_to_retrieve_token_price_title"),
        t("payment.error.failed_to_retrieve_token_price_subtitle"),
      )
      setIsLoading(false)
      return
    }

    // 6. amount to send in the respective token's smallest unit
    const amountInTokenUnits = BigInt(Math.round(tokenPrice * 10 ** 18))

    // 7. for Ethereum, BNB Smart Chain, and Polygon
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
      .then((txHash: unknown) => {
        router.push(`${location.origin}/payment?status=success`)
        console.log("You may use txHash as check QR code or payment identifier - ", txHash)
      })
      .catch((error: Error) => {
        if (error.message.includes("MetaMask Tx Signature: User denied transaction signature.")) {
          toast.show("error", t("payment.error.transaction_title"), t("payment.error.transaction_subtitle"))
        } else {
          toast.show("error", t("payment.error.transaction_failed_title"), error.message)
        }
        setIsLoading(false)
      })
  } catch (error) {
    toast.show("error", t("payment.error.failed_to_pay_with_metamask"), error instanceof Error ? error.message : String(error))
    setIsLoading(false)
  }
}
