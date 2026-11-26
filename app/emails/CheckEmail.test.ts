import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import CheckEmail from "./CheckEmail"

describe("order receipt", () => {
  it("renders the logo, product photo and localized links using the production origin", () => {
    const translation = { title: "Desk tray", description: "" }
    const html = renderToStaticMarkup(createElement(CheckEmail, {
      products: [{
        id: "prod_test",
        owner_id: "owner",
        price_id: "price_test",
        price: 12,
        img_url: ["/product-image.png"],
        translations: { fi: translation, en: translation, ru: translation, se: translation },
        on_stock: 10,
        basePrice: 12,
        cartKey: "prod_test",
        quantity: 1,
        selectedVariant: null,
        variantId: null,
      }],
      locale: "fi",
      deliveryDate: "15.12.2026",
      previewText: "Kiitos tilauksestasi",
      orderConfirmed: "Tilaus vahvistettu",
      willBeDelivered: "Arvioitu toimitus",
      quantityText: "Määrä",
      totalText: "Yhteensä",
      trackYourOrder: "Seuraa tilaustasi",
      weKeepYouUpdated: "Pidämme sinut ajan tasalla",
      supportText: "Tuki",
      allRightsReserved: "Kaikki oikeudet pidätetään",
      variantLabel: "Vaihtoehto",
      needHelpText: "Tarvitsetko apua?",
    }))

    expect(html).toContain("https://www.jokik.fi/joki-light.png")
    expect(html).toContain("https://www.jokik.fi/product-image.png")
    expect(html).toContain("https://www.jokik.fi/fi/track-order")
    expect(html).toContain("https://www.jokik.fi/fi/support")
  })
})
