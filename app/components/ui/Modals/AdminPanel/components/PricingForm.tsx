"use client"

import { useEffect, useMemo, useState } from "react"
import { BiCheck, BiLinkExternal, BiRefresh, BiX } from "react-icons/bi"
import { twMerge } from "tailwind-merge"

import { useAdminPanelChanged } from "../AdminPanelChangedContext"
import { aiPricingSDK } from "@/sdk/AIPricingSDK/AIPricingSDK"
import { formatCurrency } from "@/utils/currencyFormatter"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { useScopedI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import { Button } from "@/components/ui"

// http://localhost:6006/?path=/story/admin-adminpanelmodal--ai-pricing
export function PricingForm() {
  const t = useScopedI18n("pricing")
  const toast = useToast()
  const updateOwnerProduct = useOwnerProductsStore(state => state.updateProduct)
  const [globalEnabled, setGlobalEnabled] = useState(false)
  const [products, setProducts] = useState<API.AIPriceProductSetting[]>([])
  const [proposals, setProposals] = useState<API.AIPriceProposal[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isUpdating = updatingKey !== null
  useAdminPanelChanged("ai-pricing-request", isUpdating)

  const selectSettings = async () => {
    setIsFetching(true)
    setError(null)
    try {
      const response = await aiPricingSDK.getSettings()
      setGlobalEnabled(response.globalEnabled)
      setProducts(response.products)
      setProposals(response.proposals)
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : String(selectError))
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    void (async () => {
      try {
        const response = await aiPricingSDK.getSettings()
        if (!isMounted) return
        setGlobalEnabled(response.globalEnabled)
        setProducts(response.products)
        setProposals(response.proposals)
      } catch (selectError) {
        if (isMounted) setError(selectError instanceof Error ? selectError.message : String(selectError))
      } finally {
        if (isMounted) setIsFetching(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [])

  const pendingProposals = useMemo(
    () => proposals.filter(proposal => proposal.status === "pending"),
    [proposals],
  )
  const reviewedProposals = useMemo(
    () => proposals.filter(proposal => proposal.status !== "pending").slice(0, 10),
    [proposals],
  )

  async function updateGlobalEnabled(nextEnabled: boolean) {
    setGlobalEnabled(nextEnabled)
    setUpdatingKey("global")
    try {
      await aiPricingSDK.updateSettings({ globalEnabled: nextEnabled })
    } catch (updateError) {
      setGlobalEnabled(globalEnabled)
      toast.show("error", t("update_failed"), updateError instanceof Error ? updateError.message : String(updateError))
    } finally {
      setUpdatingKey(null)
    }
  }

  async function updateProductEnabled(productId: string, nextEnabled: boolean) {
    setProducts(currentProducts =>
      currentProducts.map(product => (product.id === productId ? { ...product, enabled: nextEnabled } : product)),
    )
    setUpdatingKey(`product-${productId}`)
    try {
      const response = await aiPricingSDK.updateSettings({ productId, enabled: nextEnabled })
      if (response.product) {
        setProducts(currentProducts =>
          currentProducts.map(product => (product.id === productId ? response.product! : product)),
        )
      }
      if (!nextEnabled) {
        setProposals(currentProposals =>
          currentProposals.map(proposal =>
            proposal.product_id === productId && proposal.status === "pending"
              ? { ...proposal, status: "expired", reviewed_at: new Date().toISOString() }
              : proposal,
          ),
        )
      }
    } catch (updateError) {
      setProducts(products)
      toast.show("error", t("update_failed"), updateError instanceof Error ? updateError.message : String(updateError))
    } finally {
      setUpdatingKey(null)
    }
  }

  async function reviewProposal(proposalId: string, action: "approve" | "reject") {
    setUpdatingKey(`proposal-${proposalId}`)
    try {
      const response =
        action === "approve"
          ? await aiPricingSDK.approveProposal(proposalId)
          : await aiPricingSDK.rejectProposal(proposalId)
      setProposals(currentProposals =>
        currentProposals.map(proposal =>
          proposal.id === proposalId
            ? { ...response.proposal, sources: proposal.sources }
            : proposal.product_id === response.proposal.product_id &&
                proposal.id !== proposalId &&
                proposal.status === "pending" &&
                action === "approve"
              ? { ...proposal, status: "expired", reviewed_at: new Date().toISOString() }
              : proposal,
        ),
      )

      if (response.product) {
        updateOwnerProduct(response.product.id, product => ({
          ...product,
          price: response.product!.price,
          price_id: response.product!.price_id,
          variants: response.product!.variants ?? null,
        }))
        setProducts(currentProducts =>
          currentProducts.map(product =>
            product.id === response.product!.id ? { ...product, price: response.product!.price } : product,
          ),
        )
      }
      toast.show("success", action === "approve" ? t("approved") : t("rejected"), response.proposal.product_name)
    } catch (reviewError) {
      toast.show("error", t("review_failed"), reviewError instanceof Error ? reviewError.message : String(reviewError))
    } finally {
      setUpdatingKey(null)
    }
  }

  if (isFetching) {
    return <p className="p-4 text-sm text-subTitle">{t("loading")}</p>
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded border border-danger/30 bg-danger/5 p-5 text-center">
        <p className="text-sm text-danger">{error}</p>
        <Button type="button" size="sm" variant="default-outline" onClick={() => void selectSettings()}>
          <BiRefresh /> {t("retry")}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4 pb-2">
      <section className="rounded border border-border-color/30 bg-background/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-title">{t("master_title")}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-subTitle">{t("master_subtitle")}</p>
          </div>
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-sm text-title">
            <input
              className="h-4 w-4 accent-success"
              type="checkbox"
              checked={globalEnabled}
              disabled={isUpdating}
              onChange={event => void updateGlobalEnabled(event.target.checked)}
            />
            {globalEnabled ? t("on") : t("off")}
          </label>
        </div>
        {!globalEnabled && (
          <p className="mt-3 rounded border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning">
            {t("paused")}
          </p>
        )}
      </section>

      <section className="rounded border border-border-color/30 bg-background/60 p-4">
        <h2 className="text-base font-semibold text-title">{t("products_title")}</h2>
        <p className="mt-1 text-sm text-subTitle">{t("products_subtitle")}</p>
        <div className="mt-3 divide-y divide-border-color/20">
          {products.map(product => (
            <div className="flex items-center justify-between gap-3 py-3" key={product.id}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-title">{product.name}</p>
                <p className="mt-0.5 text-xs text-subTitle">
                  {formatCurrency(product.price)}
                  {product.baseline !== null ? ` · ${t("baseline")}: ${formatCurrency(product.baseline)}` : ""}
                </p>
              </div>
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-xs text-subTitle">
                <input
                  className="h-4 w-4 accent-success"
                  type="checkbox"
                  checked={product.enabled}
                  disabled={isUpdating}
                  onChange={event => void updateProductEnabled(product.id, event.target.checked)}
                />
                {product.enabled ? t("included") : t("excluded")}
              </label>
            </div>
          ))}
          {!products.length && <p className="py-4 text-sm text-subTitle">{t("no_products")}</p>}
        </div>
      </section>

      <section className="rounded border border-border-color/30 bg-background/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-title">{t("proposals_title")}</h2>
            <p className="mt-1 text-sm text-subTitle">{t("proposals_subtitle")}</p>
          </div>
          <span className="rounded border border-success/25 bg-success/10 px-2 py-1 text-xs text-success">
            {pendingProposals.length} {t("pending")}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {pendingProposals.map(proposal => (
            <PriceProposalCard
              key={proposal.id}
              proposal={proposal}
              isUpdating={updatingKey === `proposal-${proposal.id}`}
              onApprove={() => void reviewProposal(proposal.id, "approve")}
              onReject={() => void reviewProposal(proposal.id, "reject")}
            />
          ))}
          {!pendingProposals.length && <p className="py-4 text-sm text-subTitle">{t("no_pending")}</p>}
        </div>
      </section>

      {reviewedProposals.length > 0 && (
        <section className="rounded border border-border-color/30 bg-background/40 p-4">
          <h2 className="text-sm font-semibold text-title">{t("recent_title")}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {reviewedProposals.map(proposal => (
              <PriceProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

interface PriceProposalCardProps {
  proposal: API.AIPriceProposal
  isUpdating?: boolean
  onApprove?: () => void
  onReject?: () => void
}

function PriceProposalCard({
  proposal,
  isUpdating = false,
  onApprove,
  onReject,
}: PriceProposalCardProps) {
  const t = useScopedI18n("pricing")
  const percentage = ((proposal.proposed_price - proposal.current_price) / proposal.current_price) * 100

  return (
    <article className="rounded border border-border-color/30 bg-foreground/[0.04] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-title">{proposal.product_name}</h3>
          <p className="mt-1 text-xs text-subTitle">
            {formatCurrency(proposal.current_price)} → {formatCurrency(proposal.proposed_price)}
            <span
              className={twMerge(
                "ml-2 font-medium",
                percentage > 0 ? "text-warning" : percentage < 0 ? "text-success" : "text-subTitle",
              )}>
              {percentage > 0 ? "+" : ""}
              {percentage.toFixed(1)}%
            </span>
          </p>
        </div>
        <span className="rounded border border-border-color/25 px-2 py-0.5 text-[10px] uppercase tracking-wide text-subTitle">
          {t(`status_${proposal.status}`)}
        </span>
      </div>

      <p className="mt-3 text-sm leading-5 text-title/85">{proposal.reasoning}</p>
      <p className="mt-2 text-[11px] text-subTitle">
        {t("baseline")}: {formatCurrency(proposal.baseline_price)} · {new Date(proposal.created_at).toLocaleDateString()}
      </p>

      {proposal.sources.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {proposal.sources.slice(0, 5).map(source => (
            <a
              className="inline-flex max-w-[240px] items-center gap-1 truncate text-xs text-info hover:underline"
              href={source.url}
              key={source.url}
              target="_blank"
              rel="noreferrer">
              <BiLinkExternal className="shrink-0" />
              <span className="truncate">{source.title || new URL(source.url).hostname}</span>
            </a>
          ))}
        </div>
      )}

      {proposal.status === "pending" && onApprove && onReject && (
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" size="sm" variant="danger-outline" disabled={isUpdating} onClick={onReject}>
            <BiX /> {t("reject")}
          </Button>
          <Button type="button" size="sm" variant="success" disabled={isUpdating} onClick={onApprove}>
            <BiCheck /> {isUpdating ? t("updating") : t("approve")}
          </Button>
        </div>
      )}
    </article>
  )
}
