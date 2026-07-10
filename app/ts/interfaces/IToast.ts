import { TToastVariant } from "@/ts/types/TToastVariant"

export interface IToast {
  isOpen: boolean
  variant: TToastVariant
  title?: string
  subTitle?: React.ReactNode
  show: (status: TToastVariant, title?: string, subTitle?: React.ReactNode, timeoutInMs?: number | null) => void
  close: () => void
}
