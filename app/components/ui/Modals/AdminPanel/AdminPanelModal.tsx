"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { twMerge } from "tailwind-merge"

import { IPendingDeleteProduct } from "@/ts/interfaces/IPendingDeleteProduct"
import { ADMIN_PRODUCT_SORTS, TAdminProductSort } from "@/ts/types/TAdminProductSort"
import { TPanelAction } from "@/ts/types/TPanelAction"
import { TProductDB } from "@/ts/product/TProductDB"
import { AddProductForm } from "./components/AddProductForm"
import { AdminPanelDeleteConfirmDialog } from "./components/AdminPanelDeleteConfirmDialog"
import { AdminPanelHeader, PANEL_ACTIONS } from "./components/AdminPanelHeader"
import { CategoriesForm } from "./components/CategoriesForm"
import { DeleteProductForm } from "./components/DeleteProductForm"
import { EditProductForm } from "./components/EditProductForm"
import { ModalQueryContainer } from "../ModalContainers/ModalQueryContainer"
import { AdminPanelDirtyProvider } from "./AdminPanelDirtyContext"
import { AdminPanelUnsavedChangesDialog } from "./components/AdminPanelUnsavedChangesDialog"
import { PricingForm } from "./components/PricingForm"
import { useI18n } from "@/locales/client"
import { useLoading } from "@/store/ui/useLoading"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"

export interface AdminPanelModalProps {
  ownerProducts: TProductDB[]
  roles: string[]
  isAuthenticated: boolean
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product&globals=backgrounds.value:dark;theme:dark
export function AdminPanelModal({ ownerProducts, roles, isAuthenticated }: AdminPanelModalProps) {
  const t = useI18n()
  const router = useRouter()
  const { products: hydratedOwnerProducts, hydrate: hydrateOwnerProducts } = useOwnerProductsStore()
  const hasHydratedOwnerProductsRef = useRef(false)

  const [panelAction, setPanelAction] = useState<TPanelAction>(PANEL_ACTIONS.add)
  const [productSort, setProductSort] = useState<TAdminProductSort>(ADMIN_PRODUCT_SORTS.createdDesc)
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<IPendingDeleteProduct | IPendingDeleteProduct[] | null>(null)
  const [dirtySections, setDirtySections] = useState<Record<string, boolean>>({})
  const [pendingDiscardAction, setPendingDiscardAction] = useState<(() => void) | null>(null)
  const hasUnsavedChangesRef = useRef(false)
  const requestGuardedActionRef = useRef<(action: () => void) => void>(() => {})
  const hasHistoryGuardRef = useRef(false)
  const ignoreNextPopStateRef = useRef(false)
  const afterGuardRemovalRef = useRef<(() => void) | null>(null)
  const { isLoading } = useLoading()
  const hasUnsavedChanges = Object.values(dirtySections).some(Boolean)

  const setSectionDirty = useCallback((section: string, isDirty: boolean) => {
    setDirtySections(currentSections => {
      if (currentSections[section] === isDirty) return currentSections
      if (!isDirty) {
        const nextSections = { ...currentSections }
        delete nextSections[section]
        return nextSections
      }
      return { ...currentSections, [section]: true }
    })
  }, [])

  const dirtyContextValue = useMemo(() => ({ setSectionDirty }), [setSectionDirty])

  const requestGuardedAction = useCallback(
    (action: () => void) => {
      if (!hasUnsavedChanges) {
        action()
        return
      }
      setPendingDiscardAction(() => action)
    },
    [hasUnsavedChanges],
  )
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges
    requestGuardedActionRef.current = action => {
      if (!hasUnsavedChanges) {
        action()
        return
      }
      setPendingDiscardAction(() => action)
    }
  }, [hasUnsavedChanges])

  const handlePanelActionChange = useCallback(
    (nextAction: TPanelAction) => {
      if (nextAction === panelAction) return
      setPanelAction(nextAction)
    },
    [panelAction],
  )

  const handleDiscard = useCallback(() => {
    const action = pendingDiscardAction
    hasUnsavedChangesRef.current = false
    setDirtySections({})
    setPendingDiscardAction(null)

    if (hasHistoryGuardRef.current) {
      hasHistoryGuardRef.current = false
      ignoreNextPopStateRef.current = true
      afterGuardRemovalRef.current = action
      window.history.back()
      return
    }

    action?.()
  }, [pendingDiscardAction])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  // A duplicate same-URL history entry keeps the first Back press inside the mounted AdminPanel,
  // where the application dialog can ask before the real navigation is allowed.
  useEffect(() => {
    if (hasUnsavedChanges && !hasHistoryGuardRef.current) {
      window.history.pushState({ ...window.history.state, adminPanelDirtyGuard: true }, "", window.location.href)
      hasHistoryGuardRef.current = true
      return
    }

    if (!hasUnsavedChanges && hasHistoryGuardRef.current && !pendingDiscardAction) {
      hasHistoryGuardRef.current = false
      ignoreNextPopStateRef.current = true
      window.history.back()
    }
  }, [hasUnsavedChanges, pendingDiscardAction])

  useEffect(() => {
    const handlePopState = () => {
      if (ignoreNextPopStateRef.current) {
        ignoreNextPopStateRef.current = false
        const action = afterGuardRemovalRef.current
        afterGuardRemovalRef.current = null
        action?.()
        return
      }

      if (!hasUnsavedChangesRef.current) return

      // The browser just removed our duplicate entry. Restore it before showing the dialog so
      // "Keep editing" leaves both the URL and the history position unchanged.
      window.history.pushState({ ...window.history.state, adminPanelDirtyGuard: true }, "", window.location.href)
      hasHistoryGuardRef.current = true
      requestGuardedActionRef.current(() => window.history.back())
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleLinkClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return

      const destination = new URL(target.href, window.location.href)
      if (destination.href === window.location.href || (destination.hash && destination.pathname === window.location.pathname)) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      requestGuardedActionRef.current(() => window.location.assign(destination.href))
    }

    document.addEventListener("click", handleLinkClick, true)
    return () => document.removeEventListener("click", handleLinkClick, true)
  }, [hasUnsavedChanges])

  useEffect(() => {
    if (hasHydratedOwnerProductsRef.current) return
    hasHydratedOwnerProductsRef.current = true
    hydrateOwnerProducts(ownerProducts)
  }, [hydrateOwnerProducts, ownerProducts])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/?modal=AuthModal&variant=login")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ModalQueryContainer
      className={twMerge(
        "flex flex-col overflow-hidden border-border-color/35 bg-modal-surface shadow-compact-lg transition-all duration-300",
        // mobile: true full-screen, no border/radius
        "h-[100dvh] w-screen rounded-none border-0",
        // tablet+: floating dialog, height bounded to the viewport so it never overflows on short screens
        "tablet:h-[88vh] tablet:max-h-[900px] tablet:w-[92vw] tablet:rounded-lg tablet:border",
        // laptop / desktop: cap width so the dialog stays readable on wide screens
        "laptop:w-[min(92vw,1100px)] desktop:w-[min(90vw,1400px)]",
      )}
      hideCloseButton
      disableDismiss={!!pendingDeleteProduct}
      ignoreInputs={false}
      onCloseRequest={requestGuardedAction}
      modalQuery="AdminPanel">
      {({ closeModal }) => (
        <AdminPanelDirtyProvider value={dirtyContextValue}>
          <AdminPanelHeader
            title={t("modal.admin_panel.label")}
            activeAction={panelAction}
            actionLabels={{
              add: t("product.add"),
              edit: t("product.edit"),
              delete: t("product.delete"),
              pricing: t("pricing.tab"),
              categories: t("modal.admin_panel.categories"),
            }}
            onActionChange={handlePanelActionChange}
            onClose={closeModal}
            disabled={isLoading || !!pendingDeleteProduct || !!pendingDiscardAction}
            roles={roles}
          />

          <div className="relative min-h-0 flex-1 overflow-hidden px-2 py-2 tablet:px-3 tablet:py-3">
            {panelAction === PANEL_ACTIONS.add && (
              <div className="h-full">
                <AddProductForm />
              </div>
            )}
            {panelAction === PANEL_ACTIONS.edit && (
              <div className="panel-scroll h-full overflow-y-auto pr-1">
                <EditProductForm
                  ownerProducts={hydratedOwnerProducts}
                  productSort={productSort}
                  onProductSortChange={setProductSort}
                />
              </div>
            )}
            {panelAction === PANEL_ACTIONS.delete && (
              <div className="panel-scroll h-full overflow-y-auto pr-1">
                <DeleteProductForm
                  ownerProducts={hydratedOwnerProducts}
                  onRequestDelete={setPendingDeleteProduct}
                  productSort={productSort}
                  onProductSortChange={setProductSort}
                />
              </div>
            )}
            {panelAction === PANEL_ACTIONS.pricing && (
              <div className="panel-scroll h-full overflow-y-auto pr-1">
                <PricingForm />
              </div>
            )}
            {panelAction === PANEL_ACTIONS.categories && roles.includes("ADMIN") && (
              <div className="panel-scroll h-full overflow-y-auto pr-1">
                <CategoriesForm />
              </div>
            )}
          </div>

          <AdminPanelDeleteConfirmDialog product={pendingDeleteProduct} onClose={() => setPendingDeleteProduct(null)} />
          <AdminPanelUnsavedChangesDialog
            isOpen={!!pendingDiscardAction}
            onDiscard={handleDiscard}
            onKeepEditing={() => setPendingDiscardAction(null)}
          />
        </AdminPanelDirtyProvider>
      )}
    </ModalQueryContainer>
  )
}
