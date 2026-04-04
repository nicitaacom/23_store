"use client"

import { RefObject, useEffect } from "react"

/**
 * Smart, reusable Esc + Click-outside handler
 * Works perfectly when nested (dropdown inside modal, modal inside drawer, etc.)
 *
 * Features:
 * • First Esc → blurs active element (input, textarea, etc.)
 * • Second Esc → runs onTrigger
 * • Stops propagation + capture phase → inner components win over parents
 * • Optional ignoreInputs → close even if an input is focused
 *
 * @param ref            – ref of the container (dropdown, modal, popover…)
 * @param onClose      – callback that closes/hides the component
 * @param options
 *   - isHookEnabled   – only activate when true (e.g. isOpen / isShowDropdown)
 *   - isInner         – true for nested components (dropdown inside modal)
 *   - ignoreInputs    – if true → treat inputs like any other element and close immediately
 *
 * @example
 * // 1. Dropdown inside a modal (inner component)
 * useEscOrClickOutside(ref, closeDropdown, {
 *   isHookEnabled: isOpen,
 *   isInner: true,          // important – blocks modal's Esc handler
 * })
 *
 * @example
 * // 2. Modal / Drawer / Popover (outer component)
 * useEscOrClickOutside(ref, onClose, {
 *   isHookEnabled: isOpen,
 *   // isInner defaults to false → modal can receive Esc when nothing inside is focused
 *   ignoreInputs: true,     // optional – close modal even if an input is focused
 * })
 */
function useEscOrClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: {
    /** Turn the whole hook on/off – usually your isOpen / isShowDropdown state */
    isHookEnabled?: boolean
    /** Set true for dropdowns/comboboxes inside modals (blocks parent listeners) */
    isInner?: boolean
    /** If true → ignore focused inputs and close immediately on Esc */
    ignoreInputs?: boolean
  } = {},
) {
  const { isHookEnabled = true, isInner = false, ignoreInputs = false } = options

  useEffect(() => {
    if (!isHookEnabled) return

    const isIgnoredTarget = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false

      const targetElement = target instanceof Element ? target : target.parentElement
      return !!targetElement?.closest("[data-click-outside-ignore]")
    }

    const handleClick = (e: MouseEvent) => {
      if (isIgnoredTarget(e.target)) return

      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
        if (isInner) e.stopPropagation()
      }
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (!ref.current) return

      const active = document.activeElement
      const isInputFocused = active && ["INPUT", "TEXTAREA", "SELECT"].includes((active.tagName || "").toUpperCase())

      // If ignoreInputs → treat inputs like any other element
      if (ignoreInputs && isInputFocused) {
        onClose()
        e.stopPropagation()
        return
      }

      // Normal flow – first Esc blurs the input
      if (ref.current.contains(active)) {
        ;(active as HTMLElement)?.blur?.()
        e.stopPropagation() // block parent handlers (modal, etc.)
        return
      }

      // Nothing focused inside → safe to close
      onClose()
      e.stopPropagation()
    }

    // Capture phase → we run BEFORE any parent listener
    document.addEventListener("keydown", handleEsc, true)
    document.addEventListener("mousedown", handleClick, true)
    document.addEventListener("contextmenu", handleClick, true)

    return () => {
      document.removeEventListener("keydown", handleEsc, true)
      document.removeEventListener("mousedown", handleClick, true)
      document.removeEventListener("contextmenu", handleClick, true)
    }
  }, [ref, onClose, isHookEnabled, isInner, ignoreInputs])
}

export default useEscOrClickOutside
