"use client"
import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import detectEthereumProvider from "@metamask/detect-provider"

import { sendMoneyWithMetamask } from "../functions/sendMoneyWithMetamask"
import { formatBalance } from "@/utils/formatMetamaskBalance"
import useCartStore from "@/store/user/cartStore"
import { useDoYouWantRecieveCheckModal } from "@/store/ui/useDoYouWantRecieveCheckModal"
import { useI18n, useScopedI18n } from "@/locales/client"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"
import useUserStore from "@/store/user/userStore"
import { Button } from "@/components/ui/Button"

// Only EVM-compatible chains work with MetaMask
const WALLET_ADDRESSES = {
  ETH: process.env.NEXT_PUBLIC_METAMASK_ADRESS_ETH,
  BNB: process.env.NEXT_PUBLIC_METAMASK_ADRESS_BNB,
  MATIC: process.env.NEXT_PUBLIC_METAMASK_ADRESS_MATIC,
} as const

type SupportedChain = keyof typeof WALLET_ADDRESSES

const CHAIN_CONFIG = {
  ETH: { name: "Ethereum", icon: "/ethereum.png", bg: "bg-blue-600", hover: "hover:bg-blue-700", text: "text-white" },
  BNB: { name: "BNB Chain", icon: "/bnb.png", bg: "bg-yellow-400", hover: "hover:bg-yellow-500", text: "text-black" },
  MATIC: {
    name: "Polygon",
    icon: "/polygon.png",
    bg: "bg-purple-500",
    hover: "hover:bg-purple-600",
    text: "text-black",
  },
} as const

// 1. checksum address function (EIP-55)
function toChecksumAddress(address: string): string {
  address = address.toLowerCase().replace("0x", "")
  const hash = Array.from(address)
    .map(char => char.charCodeAt(0))
    .reduce((acc, code) => ((acc << 5) - acc + code) | 0, 0)
    .toString(16)
  let checksumAddress = "0x"
  for (let index = 0; index < address.length; index++) {
    checksumAddress += parseInt(hash[index % hash.length], 16) > 7 ? address[index].toUpperCase() : address[index]
  }
  return checksumAddress
}

export function PayWithMetamaskButton() {
  const st = useScopedI18n("payment")
  const t = useI18n()
  const router = useRouter()
  const toast = useToast()
  const cartStore = useCartStore()
  const { wallet, setWallet, openModal: openDoYouWantRecieveCheckModal } = useDoYouWantRecieveCheckModal()
  const { user } = useUserStore()

  const [hasProvider, setHasProvider] = useState<boolean | null>(null)
  const [selectedChain, setSelectedChain] = useState<SupportedChain>("ETH")
  const [showChainSelector, setShowChainSelector] = useState(false)
  const initialState = { accounts: [], balance: "", chainId: "" }
  const { isLoading, setIsLoading } = useLoading()

  async function updateWallet(accounts: string[]) {
    const balance = formatBalance(
      (await window.ethereum!.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"],
      })) as string,
    )
    const chainId = (await window.ethereum!.request({
      method: "eth_chainId",
    })) as string
    setWallet({ accounts, balance, chainId })
  }

  useEffect(() => {
    const refreshAccounts = (accounts: string[]) => {
      if (accounts.length > 0) {
        void updateWallet(accounts)
        return
      }

      setWallet(initialState)
    }

    const refreshChain = (chainId: string) => {
      setWallet({ chainId })
    }

    const getProvider = async () => {
      const provider = await detectEthereumProvider({ silent: true })
      setHasProvider(Boolean(provider))

      if (provider) {
        const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[]
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

  async function sendMoneyWithMetamaskFunction() {
    setIsLoading(true)
    const recipientAddress = WALLET_ADDRESSES[selectedChain]

    // 1. validate address exists
    if (!recipientAddress || !recipientAddress.trim()) {
      toast.show("error", st("error.configuration_title"), st("error.configuration_subtitle", { selectedChain }))
      setIsLoading(false)
      return
    }

    const trimmedAddress = recipientAddress.trim()

    // 2. validate ethereum address format (starts with 0x and 42 chars)
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
      toast.show(
        "error",
        st("error.invalid_address_format_title"),
        st("error.invalid_address_format_subtitle", { trimmedAddressLength: trimmedAddress.length, trimmedAddress }),
      )
      setIsLoading(false)
      return
    }

    // 3. convert to checksum address (EIP-55)
    const checksummedAddress = toChecksumAddress(trimmedAddress)

    try {
      if (!user) {
        openDoYouWantRecieveCheckModal(checksummedAddress)
      } else {
        await sendMoneyWithMetamask(cartStore.getProductsPrice(), wallet, router, checksummedAddress, t)
      }
    } catch (error) {
      console.error(st("error.sending_money_with_metamask"), error)
      toast.show("error", "Transaction Error", error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async () => {
    setIsLoading(true)

    if (!hasProvider) {
      toast.show(
        "error",
        st("error.metamask_not_detected"),
        <span className="inline">
          {st("error.please_install_metamask")}&nbsp;
          <Button
            className="inline w-fit text-info"
            variant="link"
            active="active"
            target="_blank"
            href="https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?utm_source=ext_app_menu">
            {st("error.here")}
          </Button>
          {st("error.or_using")}&nbsp;
          <Button
            className="inline w-fit text-info"
            variant="link"
            active="active"
            target="_blank"
            href={`${location.origin}/docs/customer/how-to-install-metamask`}>
            {st("error.this")}&nbsp;
          </Button>
          {st("error.guide")}
          <br />
          {st("error.or_enable_metamask")}
          <Button
            onClick={() => window.location.reload()}
            className="inline w-fit text-info"
            variant="link"
            active="active"
            target="_blank">
            {st("error.reload_page")}&nbsp;
          </Button>
        </span>,
        10000,
      )
    } else {
      try {
        await window.ethereum.request({
          method: "eth_requestAccounts",
        })
      } catch {
        toast.show(
          "error",
          "You rejected connection",
          <p>
            {st("error.please_connect_one_more_time")}
            <br /> {st("error.this_time_dont_cancel_request")}
          </p>,
        )
      }
    }

    setIsLoading(false)
  }

  const config = CHAIN_CONFIG[selectedChain]

  return (
    <div className="relative">
      {showChainSelector && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border-color rounded-lg shadow-xl overflow-hidden z-10">
          {(Object.keys(CHAIN_CONFIG) as SupportedChain[]).map(chain => {
            const chainConfig = CHAIN_CONFIG[chain]
            return (
              <button
                key={chain}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  selectedChain === chain ? "bg-success/10 border-l-4 border-success" : "hover:bg-foreground-accent"
                }`}
                onClick={() => {
                  setSelectedChain(chain)
                  setShowChainSelector(false)
                }}>
                <Image className="w-6 h-6" width={24} height={24} src={chainConfig.icon} alt={chainConfig.name} />
                <span className="text-sm font-medium text-title">{chainConfig.name}</span>
                {selectedChain === chain && <span className="ml-auto text-success text-xs">✓</span>}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          className={`flex-1 group relative overflow-hidden ${config.bg} ${config.hover} ${config.text}
          border-0 font-semibold shadow-lg hover:shadow-xl transition-all`}
          size="lg"
          rounded="lg"
          disabled={isLoading}
          onClick={wallet.chainId ? sendMoneyWithMetamaskFunction : handleConnect}
          rightIcon={
            <Image
              className="w-6 h-6 group-hover:scale-110 transition-transform"
              width={32}
              height={32}
              src={config.icon}
              alt={config.name}
            />
          }>
          {config.name}
        </Button>

        <Button
          className={`group ${config.bg} ${config.hover} ${config.text} border-0 font-semibold shadow-lg hover:shadow-xl transition-all`}
          size="icon-lg"
          rounded="lg"
          disabled={isLoading}
          onClick={() => setShowChainSelector(!showChainSelector)}
          title="Select network">
          <span className="text-lg">⚡</span>
        </Button>
      </div>
    </div>
  )
}
