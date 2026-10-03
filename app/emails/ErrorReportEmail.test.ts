import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ErrorReportEmail } from "./ErrorReportEmail"

describe("ErrorReportEmail", () => {
  it("includes the page and stack for a minified browser error", () => {
    const html = renderToStaticMarkup(
      createElement(ErrorReportEmail, {
        message: "i is not a function",
        pageUrl: "https://jokik.fi/ru/products/example",
        stack: "TypeError: i is not a function at ProductDetailView",
      }),
    )

    expect(html).toContain("https://jokik.fi/ru/products/example")
    expect(html).toContain("TypeError: i is not a function at ProductDetailView")
  })
})
