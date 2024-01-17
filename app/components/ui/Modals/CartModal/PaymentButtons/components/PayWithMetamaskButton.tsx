"use client"
import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import axios from "axios"
import detectEthereumProvider from "@metamask/detect-provider"

import useCartStore from "@/store/user/cartStore"
import { formatBalance } from "@/utils/formatMetamaskBalance"
import { Button } from "@/components/ui/Button"
import useToast from "@/store/ui/useToast"
import { useLoading } from "@/store/ui/useLoading"

export function PayWithMetamaskButton() {
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()

  const [hasProvider, setHasProvider] = useState<boolean | null>(null)
  const initialState = { accounts: [], balance: "", chainId: "" }
  const [wallet, setWallet] = useState(initialState)
  const { isLoading, setIsLoading } = useLoading()

  useEffect(() => {
    const refreshAccounts = (accounts: never[]) => {
      if (accounts.length > 0) {
        updateWallet(accounts)
      } else {
        // if length 0, user is disconnected
        setWallet(initialState)
      }
    }

    const refreshChain = (chainId: string) => {
      setWallet(wallet => ({ ...wallet, chainId }))
    }

    const getProvider = async () => {
      const provider = await detectEthereumProvider({ silent: true })
      setHasProvider(Boolean(provider))

      if (provider) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" })
        refreshAccounts(accounts)
        window.ethereum.on("accountsChanged", refreshAccounts)
        window.ethereum.on("chainChanged", refreshChain)
      }
    }

    getProvider()

    return () => {
      window.ethereum?.removeListener("accountsChanged", refreshAccounts)
      window.ethereum?.removeListener("chainChanged", refreshChain)
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* -------- FUNCTIONS --------- */

  const updateWallet = async (accounts: never[]) => {
    const balance = formatBalance(
      await window.ethereum!.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"],
      }),
    )
    const chainId = await window.ethereum!.request({
      method: "eth_chainId",
    })
    setWallet({ accounts, balance, chainId })
  }

  async function sendMoneyWithMetamask() {
    setIsLoading(true)

    try {
      const response = await axios.post(`${location.origin}/api/coinmarketcap`, {
        amount: cartStore.getProductsPrice(),
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
              value: BigInt(ETHPrice * 10 ** 18).toString(16),
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
        })
        .finally(() => setIsLoading(false))
    } catch (error: any) {
      toast.show("error", "Failed to pay with metamask", error.message as string)
      setIsLoading(false)
    }
  }

  const handleConnect = async () => {
    setIsLoading(true)

    if (!hasProvider) {
      toast.show(
        "error",
        "Metamask not detected",
        <span className="inline">
          Please install metamask&nbsp;
          <Button
            className="inline w-fit text-info"
            variant="link"
            active="active"
            target="_blank"
            href="https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?utm_source=ext_app_menu">
            here{" "}
          </Button>
          or using&nbsp;
          <Button
            className="inline w-fit text-info"
            variant="link"
            active="active"
            target="_blank"
            href={`${location.origin}/docs/customer/how-to-install-metamask`}>
            this&nbsp;
          </Button>
          guide
          <br />
          or enable metamask extention
        </span>,
        10000,
      )
    } else {
      await window.ethereum.request({
        method: "eth_requestAccounts",
      })
    }

    setIsLoading(false)
  }

  return (
    <Button
      className="flex flex-row gap-x-1 w-full laptop:w-full"
      disabled={isLoading}
      variant="info"
      onClick={wallet.chainId ? sendMoneyWithMetamask : handleConnect}>
      Metamask
      <Image className="w-[20px] h-[20px]" width={32} height={32} src="/metamask.png" alt="metamask" />
    </Button>
  )
}
