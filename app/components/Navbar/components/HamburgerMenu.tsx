"use client"

import { useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useSwipeable } from "react-swipeable"
import { AiOutlineMenu } from "react-icons/ai"
import { IoMdClose } from "react-icons/io"

import useOnEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"
import { useSidebar } from "@/store/ui"

const menuItems = [
  { label: "Jokik Music", href: "https://music.jokik.fi" },
  { label: "Jotion", href: "https://jotion.jokik.fi" },
  { label: "Jompanion", href: "https://jompanion.jokik.fi" },
] as const

export function HamburgerMenu() {
  const pathname = usePathname()
  const { isSidebar, openSidebar, closeSidebar } = useSidebar()
  const containerRef = useRef<HTMLDivElement>(null)
  const links = useMemo(() => menuItems, [])

  useOnEscOrClickOutside(containerRef, closeSidebar, { isHookEnabled: isSidebar, ignoreInputs: true })

  useEffect(() => {
    closeSidebar()
  }, [pathname, closeSidebar])

  useEffect(() => {
    document.body.style.overflow = isSidebar ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [isSidebar])

  const overlayHandlers = useSwipeable({
    onSwipedLeft: closeSidebar,
    onSwipedUp: closeSidebar,
    trackMouse: true,
  })

  const panelHandlers = useSwipeable({
    onSwipedLeft: closeSidebar,
    trackMouse: true,
  })

  return (
    <>
      <button
        className="flex items-center justify-center rounded-[10px] border border-transparent p-1 transition-colors duration-200 hover:border-border-color/70 hover:bg-foreground"
        type="button"
        aria-label="Open menu"
        aria-expanded={isSidebar}
        onClick={openSidebar}>
        <AiOutlineMenu className="flex cursor-pointer" size={28} />
      </button>

      <AnimatePresence>
        {isSidebar && (
          <motion.div
            className="fixed inset-0 z-[1602] bg-[rgba(0,0,0,0.5)] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            {...overlayHandlers}>
            <motion.aside
              className="absolute left-0 top-0 h-full w-[min(82vw,320px)]"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              {...panelHandlers}>
              <div
                ref={containerRef}
                className="flex h-full flex-col border-r border-border-color bg-foreground px-4 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                <div className="mb-6 flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-xs uppercase tracking-[0.2em] text-subTitle">Menu</p>
                  <h2 className="text-xl font-semibold text-title">Projects</h2>
                </div>
                <button
                  className="rounded-[10px] border border-border-color/70 bg-background/70 p-1 text-icon-color transition-colors duration-200 hover:bg-foreground-accent/40"
                  type="button"
                  aria-label="Close menu"
                  onClick={closeSidebar}>
                  <IoMdClose size={26} />
                </button>
                </div>

                <nav className="flex flex-col gap-2">
                  {links.map(item => (
                    <Link
                      key={item.href}
                      className="rounded-[12px] border border-border-color/70 bg-background px-4 py-3 text-base font-medium text-title transition-colors duration-200 hover:bg-foreground-accent/40"
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={closeSidebar}>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
