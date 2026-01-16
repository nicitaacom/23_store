import { create } from "zustand"

/* usage
const message = useMessage()

message.show('status',?'title',?'subTitle',?timeout)
e.g
message.show('success')
message.show('success','custom title')
message.show('success','custom title','custom subTitle')
message.show('success','custom title','custom subTitle',3000) //disashow after 3s

*/

export type ToastVariant = "success" | "error" | "warning"

export interface IToast {
  isOpen: boolean
  variant: ToastVariant
  title?: string
  subTitle?: React.ReactNode
  show: (status: ToastVariant, title?: string, subTitle?: React.ReactNode, timeoutInMs?: number) => void
  close: () => void
}

export const useToast = create<IToast>(set => ({
  isOpen: false,
  variant: "success",

  show: (status, title, subTitle, timeoutInMs = 8000) => {
    set({
      isOpen: true,
      variant: status,
      title,
      subTitle,
    })

    const timer = setTimeout(() => set({ isOpen: false }), timeoutInMs)

    // Cleanup timer on unmount
    return () => clearTimeout(timer)
  },

  close: () => set({ isOpen: false }),
}))
export default useToast
