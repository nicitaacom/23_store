import { AnimatePresence, motion } from "framer-motion"
import { useSidebar } from "../../store/ui/useHamburgerMenu"

export function Sidebar() {
  const sidebar = useSidebar()

  return (
    <AnimatePresence>
      {sidebar.isSidebar && (
        <div className={`fixed bg-black/[0.6] top-0 right-0 left-0 bottom-0 z-[99]`} onClick={sidebar.closeSidebar}>
          <motion.div
            className={`fixed top-0 bottom-0 left-0 w-[75%] tablet:w-[50%] laptop:w-[33%]
            flex laptop:flex-col gap-y-4 laptop:px-4 py-2 bg-foreground`}
            animate={{ x: ["-100%", "0%"] }}
            exit={{ x: ["0%", "-100%"] }}
            transition={{ duration: 0.4 }}
            onClick={e => e.stopPropagation()}>
            Sidebar content
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
