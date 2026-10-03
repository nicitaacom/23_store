export function getUrlWithoutModal(href: string, modalQuery: string) {
  const nextUrl = new URL(href)
  const otherModals = nextUrl.searchParams.getAll("modal").filter(value => value !== modalQuery)
  nextUrl.searchParams.delete("modal")
  otherModals.forEach(value => nextUrl.searchParams.append("modal", value))
  if (modalQuery === "AuthModal") nextUrl.searchParams.delete("variant")
  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
}
