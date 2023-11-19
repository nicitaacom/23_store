import { IConversation } from "@/interfaces/IConversation"

export function MobileSidebar({ sender_username }: IConversation) {
  return (
    <aside className="block laptop:hidden w-full h-full">
      <nav className="flex flex-col gap-y-4 justify-center items-center px-16">
        <div className="relative w-full border border-border-color text-center pl-4 pr-8 py-2">
          <h3 className="font-semibold truncate">{sender_username}</h3>
          <div
            className="before:absolute before:w-[25px] before:h-[25px] before:bg-info before:rounded-full
        before:right-2 before:translate-y-[-100%] before:z-[9]
        after:absolute after:w-[20px] after:h-[20px] after:text-title-foreground
        after:right-2.5 after:translate-y-[-120%] after:z-[9] after:content-['99']"
          />
        </div>
        {/* TODO - create case if messages more then 99 - show 99 */}
        <div className="relative w-full border border-border-color text-center pl-4 pr-8 py-2">
          <h3 className="font-semibold">Username_long</h3>
          <div
            className="before:absolute before:w-[25px] before:h-[25px] before:bg-info before:rounded-full
        before:right-2 before:translate-y-[-100%] before:z-[9]
        after:absolute after:w-[20px] after:h-[20px] after:text-title-foreground
        after:right-2.5 after:translate-y-[-120%] after:z-[9] after:content-['99+']"
          />
        </div>
        <div className="relative w-full border border-border-color text-center pl-4 pr-8 py-2">
          <h3 className="font-semibold">Username</h3>
          <div
            className="before:absolute before:w-[25px] before:h-[25px] before:bg-info before:rounded-full
        before:right-2 before:translate-y-[-100%] before:z-[9]
        after:absolute after:w-[20px] after:h-[20px] after:text-title-foreground
        after:right-2.5 after:translate-y-[-120%] after:z-[9] after:content-['99']"
          />
        </div>
        <div className="relative w-full border border-border-color text-center pl-4 pr-8 py-2">
          <h3 className="font-semibold">Username</h3>
          <div
            className="before:absolute before:w-[25px] before:h-[25px] before:bg-info before:rounded-full
        before:right-2 before:translate-y-[-100%] before:z-[9]
        after:absolute after:w-[20px] after:h-[20px] after:text-title-foreground
        after:right-2.5 after:translate-y-[-120%] after:z-[9] after:content-['99']"
          />
        </div>
        {/* UNREAD (sort - unread first) */}
        <div className="w-full border border-border-color text-subTitle text-center px-4 py-2">Username</div>
        <div className="w-full border border-border-color text-subTitle text-center px-4 py-2">Username</div>
        <div className="w-full border border-border-color text-subTitle text-center px-4 py-2">Username</div>
        <div className="w-full border border-border-color text-subTitle text-center px-4 py-2">Username</div>
        <div className="w-full border border-border-color text-subTitle text-center px-4 py-2">Username</div>
        <div className="w-full border border-border-color text-subTitle text-center px-4 py-2">Username</div>
      </nav>
    </aside>
  )
}
