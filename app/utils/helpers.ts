//This function may be user on client side and server side
export function getURL() {
  // if you change port - change it here as well
  let url =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3023"
      : // eslint-disable-next-line local-rules/no-undefined-used-envs -- NEXT_PUBLIC_SITE_URL/NEXT_PUBLIC_VERCEL_URL are intentionally undeclared, platform/legacy fallbacks only
        (process.env.NEXT_PUBLIC_PRODUCTION_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL)

  url = url.includes("http") ? url : `https://${url}`
  url = url.charAt(url.length - 1) === "/" ? url : `${url}/`

  return url
}
