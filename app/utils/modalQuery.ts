export function getUrlWithoutModal(href: string, modalQuery: string) {
  const nextUrl = new URL(href)
  const otherModals = nextUrl.searchParams.getAll("modal").filter(value => value !== modalQuery)
  nextUrl.searchParams.delete("modal")
  otherModals.forEach(value => nextUrl.searchParams.append("modal", value))
  if (modalQuery === "AuthModal") nextUrl.searchParams.delete("variant")
  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
}

export function openModalOnCurrentPage(modalQuery: string, variant?: string) {
  const url = new URL(window.location.href)
  url.searchParams.set("modal", modalQuery)
  if (variant) url.searchParams.set("variant", variant)
  // Next's history listener updates useSearchParams when state is null; reusing its current
  // internal state changed the address bar without mounting the modal in browser testing.
  window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`)
}
