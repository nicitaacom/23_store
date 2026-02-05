import { MetadataRoute } from "next"

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    // "/privacy-policy", "/terms-of-service",
    rules: [
      { userAgent: "*", allow: ["/", "/privacy-policy", "/terms-of-service", "/payment", "/search", "/support", "/track-order"] },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_PRODUCTION_URL}/sitemap.xml`,
  }
}
