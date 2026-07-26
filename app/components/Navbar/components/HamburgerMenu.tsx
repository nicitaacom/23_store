"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useSwipeable } from "react-swipeable"
import { AiOutlineMenu } from "react-icons/ai"
import { FiExternalLink } from "react-icons/fi"
import { IoMdClose } from "react-icons/io"

import { useEcosystemHintStore, useSidebar } from "@/store/ui"
import useOnEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"
import { LanguageDropdown } from "@/components/LanguageDropdown"

const menuItems = [
  {
    label: "Jokik Music",
    href: "https://music.jokik.fi?utm_source=23_store&utm_medium=hamburger_menu&utm_campaign=ecosystem",
    description: "Music platform",
    iconSrc: "/projects/spotify.png",
    iconAlt: "Jokik Music icon",
    isFeatured: true,
  },
  {
    label: "Jotion",
    href: "https://jotion.jokik.fi?utm_source=23_store&utm_medium=hamburger_menu&utm_campaign=ecosystem",
    description: "Notes and docs",
    iconSrc: "/projects/J.png",
    iconAlt: "Jotion icon",
    isFeatured: false,
  },
  {
    label: "Jompanion",
    href: "https://jompanion.jokik.fi?utm_source=23_store&utm_medium=hamburger_menu&utm_campaign=ecosystem",
    description: "AI companion",
    iconSrc: "/projects/AI.png",
    iconAlt: "Jompanion icon",
    isFeatured: false,
  },
] as const

const hintBorderDurationMs = 2800

// The ring sits 4px outside the element it highlights, so the svg gets the same inset and no
// viewBox - a stretched viewBox would make the 2px stroke thick on the long edges and thin on the
// short ones, and would bend the corner radius. `pathLength` normalizes the dash to the perimeter.
function ProgressBorder({ radius }: { radius: number }) {
  return (
    <svg className="pointer-events-none absolute inset-[-4px] overflow-visible" aria-hidden="true">
      <rect
        width="100%"
        height="100%"
        rx={radius}
        fill="none"
        stroke="white"
        strokeWidth="2"
        pathLength="100"
        strokeDasharray="25 75"
        strokeLinecap="round">
        <animate attributeName="stroke-dashoffset" from="0" to="-200" dur={`${hintBorderDurationMs}ms`} repeatCount="1" fill="freeze" />
      </rect>
    </svg>
  )
}

function HintRing({ radius, isBorderLoading }: { radius: number; isBorderLoading: boolean }) {
  return (
    <>
      <span
        style={{ borderRadius: radius }}
        className={`pointer-events-none absolute inset-[-4px] border-2 ${
          isBorderLoading
            ? "border-white/40"
            : "animate-pulse border-white shadow-[0_0_4px_#fff,0_0_10px_rgba(255,255,255,0.75),0_0_16px_rgba(255,255,255,0.45)]"
        }`}
        aria-hidden="true"
      />
      {isBorderLoading && <ProgressBorder radius={radius} />}
    </>
  )
}

// http://localhost:6006/?path=/story/navigation-navbar--mobile-menu
export function HamburgerMenu() {
  const pathname = usePathname()
  const { isSidebar, openSidebar, closeSidebar } = useSidebar()
  const { hintStage, hasHydrated, initializeHint, markMenuOpened, markMusicClicked, setHasHydrated } = useEcosystemHintStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isBorderLoading, setIsBorderLoading] = useState(hintStage !== "complete")
  const isHintVisible = hasHydrated && hintStage !== "complete"

  useOnEscOrClickOutside(containerRef, closeSidebar, { isHookEnabled: isSidebar, ignoreInputs: true })

  useEffect(() => {
    closeSidebar()
  }, [pathname, closeSidebar])

  useEffect(() => {
    initializeHint()
    setHasHydrated()
  }, [initializeHint, setHasHydrated])

  useEffect(() => {
    if (!isHintVisible || !isBorderLoading) return
    const timeoutId = window.setTimeout(() => setIsBorderLoading(false), hintBorderDurationMs)
    return () => window.clearTimeout(timeoutId)
  }, [hintStage, isHintVisible, isBorderLoading])

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
      <div className="relative">
        <button
          className="flex items-center justify-center rounded-[10px] border border-transparent p-1 transition-colors duration-200 hover:border-border-color/70 hover:bg-foreground"
          type="button"
          aria-label="Open menu"
          aria-expanded={isSidebar}
          onClick={() => {
            openSidebar()
            markMenuOpened()
            setIsBorderLoading(true)
          }}>
          <AiOutlineMenu className="flex cursor-pointer" size={28} />
        </button>
        {isHintVisible && hintStage === "hamburger" && <HintRing radius={14} isBorderLoading={isBorderLoading} />}
      </div>

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
                className="flex h-full flex-col border-r border-border-color bg-foreground px-4 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
                ref={containerRef}>
                <div className="mb-6 rounded-[18px] border border-border-color/70 bg-background/80 px-4 py-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-xs uppercase tracking-[0.2em] text-subTitle">Menu</p>
                      <h2 className="text-xl font-semibold text-title">Projects</h2>
                    </div>
                    <button
                      className="rounded-[10px] border border-border-color/70 bg-foreground p-1 text-icon-color transition-colors duration-200 hover:bg-foreground-accent/40"
                      type="button"
                      aria-label="Close menu"
                      onClick={closeSidebar}>
                      <IoMdClose size={26} />
                    </button>
                  </div>
                  <p className="text-sm leading-6 text-subTitle">Quick links to the rest of the Jokik project ecosystem.</p>
                </div>

                <nav className="flex flex-col gap-2">
                  {menuItems.map(item => (
                    <div className="relative" key={item.href}>
                      <Link
                        className="group flex items-center gap-3 rounded-[16px] border border-border-color/70 bg-background px-4 py-3 transition-all duration-200 hover:-translate-y-[1px] hover:border-brand/40 hover:bg-foreground-accent/40"
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (item.isFeatured) markMusicClicked()
                          closeSidebar()
                        }}>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-border-color/60 bg-foreground">
                          <Image className="h-8 w-8 object-contain" src={item.iconSrc} alt={item.iconAlt} width={32} height={32} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-base font-medium text-title">{item.label}</p>
                            {isHintVisible && item.isFeatured && hintStage === "music" && (
                              <span className="shrink-0 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">
                                Try it
                              </span>
                            )}
                          </div>
                          <p className="truncate text-sm text-subTitle">{item.description}</p>
                        </div>
                        <FiExternalLink
                          className="shrink-0 text-icon-color transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          size={18}
                        />
                      </Link>
                      {isHintVisible && item.isFeatured && hintStage === "music" && (
                        <HintRing radius={20} isBorderLoading={isBorderLoading} />
                      )}
                    </div>
                  ))}
                </nav>

                {/* Language picker lives here on mobile (the navbar hides it below tablet) */}
                <div className="mt-auto border-t border-border-color/40 pt-4 tablet:hidden">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-subTitle">Language</p>
                  <LanguageDropdown className="w-full" isDropUp />
                </div>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
