import { DesktopSidebar } from "./DesktopSidebar"
import { MobileSidebar } from "./MobileSidebar"

export function ConversationsList({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[calc(100vh-64px)] flex">
      <DesktopSidebar />
      <MobileSidebar />
      <main className="hidden laptop:flex w-[calc(100%-16rem)] h-full">{children}</main>
    </div>
  )
}
