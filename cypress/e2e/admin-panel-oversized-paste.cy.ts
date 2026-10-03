type TFixtureAccount = {
  id: string
  email: string
  password: string
}

describe("Admin Panel oversized image paste", () => {
  let owner: TFixtureAccount

  before(() => {
    cy.task<{ owner: TFixtureAccount }>("prepareFixtures").then(fixtures => {
      owner = fixtures.owner
    })
  })

  it("keeps the panel visible while the file size warning appears", () => {
    cy.signIn(owner)
    cy.visit("/?modal=AdminPanel")
    cy.get('[data-cy="admin-panel-close"]').should("be.visible")

    const visibilitySamples: boolean[] = []
    let stopMonitoring = () => {}

    cy.window().then(async window => {
      const canvas = window.document.createElement("canvas")
      canvas.width = 1024
      canvas.height = 1024
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Canvas context unavailable")

      const pixels = context.createImageData(canvas.width, canvas.height)
      const randomBytes = new Uint8Array(pixels.data.buffer)
      for (let index = 0; index < randomBytes.length; index += 65536) {
        window.crypto.getRandomValues(randomBytes.subarray(index, index + 65536))
      }
      for (let index = 3; index < pixels.data.length; index += 4) pixels.data[index] = 255
      context.putImageData(pixels, 0, 0)

      const image = await new Promise<File>((resolve, reject) => {
        canvas.toBlob(
          encodedImage => encodedImage
            ? resolve(new window.File([encodedImage], "oversized-paste.png", { type: "image/png" }))
            : reject(new Error("Could not encode image")),
          "image/png",
        )
      })
      expect(image.size).to.be.greaterThan(1024 * 1024)

      const clipboard = new window.DataTransfer()
      clipboard.items.add(image)

      const monitor = window.setInterval(() => {
        const panelCloseButton = window.document.querySelector('[data-cy="admin-panel-close"]')
        visibilitySamples.push(!!panelCloseButton?.getClientRects().length)
      }, 10)
      stopMonitoring = () => window.clearInterval(monitor)

      const pasteEvent = new window.ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboard,
      })
      window.dispatchEvent(pasteEvent)
      expect(pasteEvent.defaultPrevented).to.equal(true)
    })

    cy.get("div[data-click-outside-ignore].fixed").should("contain", "oversized-paste.png")
    cy.get('[data-cy="admin-panel-close"]').should("be.visible")
    cy.location("search").should("include", "modal=AdminPanel")
    cy.then(() => {
      stopMonitoring()
      expect(visibilitySamples.length).to.be.greaterThan(0)
      expect(visibilitySamples.every(Boolean)).to.equal(true)
    })
  })
})

export {}
