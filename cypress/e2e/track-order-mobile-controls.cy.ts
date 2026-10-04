const viewports = [
  { width: 320, height: 480 },
  { width: 332, height: 568 },
  { width: 414, height: 480 },
]

describe("track order mobile controls", () => {
  viewports.forEach(({ width, height }) => {
    it(`keeps the order number field and submit control easy to tap at ${width}×${height}`, () => {
      cy.viewport(width, height)
      cy.visit("/en/track-order")

      cy.get('[data-cy="track-order-content"]').should(content => {
        expect(getComputedStyle(content[0]).paddingLeft, "phone page gutter").to.equal("0px")
        expect(getComputedStyle(content[0]).paddingRight, "phone page gutter").to.equal("0px")
      })
      cy.get('[data-cy="track-order-search-card"]').should(card => {
        expect(parseFloat(getComputedStyle(card[0]).paddingLeft), "phone card padding").to.be.at.most(8)
      })
      cy.get('[data-cy="track-order-number"]').should("be.visible").should(input => {
        expect((input[0] as HTMLInputElement).labels, "order number label").to.have.length(1)
        expect(input[0].getBoundingClientRect().height, "order number hit area").to.be.at.least(44)
      })
      cy.get('[data-cy="track-order-submit"]').should("be.visible").should(button => {
        expect(button[0].getBoundingClientRect().height, "track action hit area").to.be.at.least(44)
      })
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      })
      cy.get('[data-cy="track-order-feedback"]').scrollIntoView().should("be.visible").should(link => {
        const bounds = link[0].getBoundingClientRect()
        expect(bounds.height, "feedback link hit area after scrolling").to.be.at.least(44)
        expect(bounds.top, "feedback link stays inside short viewport").to.be.at.least(0)
        expect(bounds.bottom, "feedback link stays inside short viewport").to.be.at.most(height)
      })
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth, "no overflow after scrolling to the footer").to.be.at.most(
          document.documentElement.clientWidth,
        )
      })
    })
  })

  ;[
    { name: "default", theme: null },
    { name: "Halloween", theme: "halloween" },
    { name: "New Year", theme: "new-year" },
  ].forEach(({ name, theme }) => {
    it(`keeps disabled order controls and tracking notice readable in the ${name} theme`, () => {
      cy.viewport(320, 480)
      cy.visit("/en/track-order")
      cy.document().then(document => {
        if (theme) document.documentElement.dataset.theme = theme
        else delete document.documentElement.dataset.theme
        expect(document.documentElement.dataset.theme || "default", "active theme").to.equal(theme || "default")
      })

      cy.get('[data-cy="track-order-submit"]').should(button => {
        const style = getComputedStyle(button[0])
        const opacity = Number(style.opacity)
        const surface = getEffectiveBackground(button[0].parentElement!)
        const visibleText = compositeColor(style.color, surface, opacity)
        const visibleButton = compositeColor(style.backgroundColor, surface, opacity)
        const contrast = getContrastRatio(visibleText, visibleButton)
        expect(Number(style.opacity), "disabled button opacity").to.equal(1)
        expect(contrast, `visible disabled Track contrast (${visibleText} on ${visibleButton})`).to.be.at.least(4.5)
      })

      cy.get('[data-cy="track-order-number"]').should(input => {
        const style = getComputedStyle(input[0])
        const placeholderColor = getComputedStyle(input[0], "::placeholder").color
        const contrast = getContrastRatio(placeholderColor, style.backgroundColor)
        expect(contrast, `order number placeholder contrast (${placeholderColor} on ${style.backgroundColor})`).to.be.at.least(4.5)
      })

      cy.get('[data-cy="track-order-status-notice"]').within(() => {
        cy.get("p").each(message => {
          const style = getComputedStyle(message[0])
          const surface = getEffectiveBackground(message[0].closest('[data-cy="track-order-status-notice"]')!)
          const contrast = getContrastRatio(style.color, surface)
          expect(contrast, `tracking notice contrast (${style.color} on ${surface})`).to.be.at.least(4.5)
        })
      })

      if (theme === "halloween") cy.screenshot("track-order-contrast-verified-after-320x480", { capture: "viewport" })
    })
  })
})

function getContrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = getRelativeLuminance(parseRgb(foreground))
  const backgroundLuminance = getRelativeLuminance(parseRgb(background))
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

function parseRgb(color: string): [number, number, number] {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number)
  expect(channels, `RGB color ${color}`).to.have.length(3)
  return channels as [number, number, number]
}

function getEffectiveBackground(element: HTMLElement): string {
  const layers: Array<{ color: [number, number, number]; alpha: number }> = []
  let current: HTMLElement | null = element

  while (current) {
    const color = getComputedStyle(current).backgroundColor
    const channels = color.match(/[\d.]+/g)?.map(Number)
    if (channels?.length) {
      const alpha = channels[3] ?? 1
      layers.push({ color: channels.slice(0, 3) as [number, number, number], alpha })
      if (alpha === 1) break
    }
    current = current.parentElement
  }

  let composite: [number, number, number] = [255, 255, 255]
  for (const layer of layers.reverse()) {
    composite = composite.map((channel, index) => layer.color[index] * layer.alpha + channel * (1 - layer.alpha)) as [number, number, number]
  }

  return `rgb(${composite.map(Math.round).join(", ")})`
}

function compositeColor(foreground: string, background: string, opacity: number): string {
  const foregroundChannels = parseRgb(foreground)
  const backgroundChannels = parseRgb(background)
  const composite = foregroundChannels.map((channel, index) => channel * opacity + backgroundChannels[index] * (1 - opacity))

  return `rgb(${composite.map(Math.round).join(", ")})`
}

function getRelativeLuminance([red, green, blue]: [number, number, number]): number {
  const linearize = (channel: number) => {
    const normalized = channel / 255
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue)
}

export {}
