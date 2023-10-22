import ReactDOM from "react-dom"
import type { PropsWithChildren } from "react"

export const Portal = ({ children }: PropsWithChildren) => {
  if (typeof window === "undefined") return null

  return ReactDOM.createPortal(children, document.getElementById("portal")!)
}
