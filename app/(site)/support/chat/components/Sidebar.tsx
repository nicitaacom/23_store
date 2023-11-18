import { DesktopSidebar } from "./DesktopSidebar"
import { MobileSidebar } from "./MobileSidebar"

export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[calc(100vh-64px)]">
      <DesktopSidebar />
      <MobileSidebar />
      <main className="lg:pl-20 h-full">{children}</main>
    </div>
  )
}
