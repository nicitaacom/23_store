import { BsStars } from "react-icons/bs"

export function ChatHeader() {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="p-2 rounded-lg bg-success/10 border border-success/20">
        <BsStars className="text-lg text-success" />
      </div>
      <div>
        <h3 className="text-title font-semibold text-base">AI Shopping Assistant</h3>
        <p className="text-subTitle text-sm">Find your perfect product in seconds</p>
      </div>
    </div>
  )
}
