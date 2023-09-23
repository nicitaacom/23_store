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

interface MessageStore {
  isOpen: boolean
  show: (status: "error" | "success", title?: string, subTitle?: React.ReactNode, timeoutInMs?: number) => void
  title?: string
  subTitle?: React.ReactNode
  error?: boolean
  success?: boolean
}

export const useToast = create<MessageStore>((set, get) => ({
  isOpen: false,
  error: false,
  success: false,
  _subTitle: "",
  show: (status: string, _title?: string, _subTitle?: React.ReactNode, timeoutInMs?: number) => {
    set({ isOpen: !get().isOpen }),
      status === "success" ? set({ error: false, success: true }) : set({ error: true, success: false })
    set({ title: _title }),
      set({ subTitle: _subTitle }),
      setTimeout(
        () => {
          set({ isOpen: !get().isOpen })
        },
        timeoutInMs ? timeoutInMs : 5000,
      )
  },
}))

export default useToast
