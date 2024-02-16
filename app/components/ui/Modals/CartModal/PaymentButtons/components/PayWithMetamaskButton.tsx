"use client"
import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import detectEthereumProvider from "@metamask/detect-provider"

import { formatBalance } from "@/utils/formatMetamaskBalance"
import { Button } from "@/components/ui/Button"
import useToast from "@/store/ui/useToast"
import { useLoading } from "@/store/ui/useLoading"
import { useDoYouWantRecieveCheckModal } from "@/store/ui/doYouWantRecieveCheckModal"
import cartStore from "@/store/user/cartStore"
import useUserStore from "@/store/user/userStore"
import { sendMoneyWithMetamask } from "../../../DoYouWantRecieveCheckModal"
import useCartStore from "@/store/user/cartStore"

export function PayWithMetamaskButton() {
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()
  const { wallet, setWallet, openModal: openDoYouWantRecieveCheckModal } = useDoYouWantRecieveCheckModal()
  const { isAuthenticated } = useUserStore()

  const [hasProvider, setHasProvider] = useState<boolean | null>(null)
  const initialState = { accounts: [], balance: "", chainId: "" }
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
      setWallet({ chainId: chainId })
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
    console.log(76, "{ accounts, balance, chainId } - ", { accounts, balance, chainId })
    setWallet({ accounts, balance, chainId })
  }

  async function sendMoneyWithMetamaskFunction() {
    console.log(80)
    setIsLoading(true)
    !isAuthenticated
      ? openDoYouWantRecieveCheckModal()
      : await sendMoneyWithMetamask(cartStore.getProductsPrice(), wallet, router, toast, setIsLoading)
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
            here
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
      try {
        await window.ethereum.request({
          method: "eth_requestAccounts",
        })
      } catch (error) {
        toast.show(
          "error",
          "You rejected connection",
          <p>
            Please connect one more time and
            <br /> this time don&apos;t cancel request
          </p>,
        )
      }
    }

    setIsLoading(false)
  }

  return (
    <Button
      className="flex flex-row gap-x-1 w-full laptop:w-full"
      disabled={isLoading}
      variant="info"
      onClick={wallet.chainId ? sendMoneyWithMetamaskFunction : handleConnect}>
      Metamask
      <Image className="w-[20px] h-[20px]" width={32} height={32} src="/metamask.png" alt="metamask" />
    </Button>
  )
}
