type TFixtureAccount = {
  id: string
  email: string
  password: string
}

type TFixtureProduct = {
  id: string
}

type TFixtures = {
  owner: TFixtureAccount
  ownerProduct: TFixtureProduct
}

const mobileViewports = [
  { width: 320, height: 480 },
  { width: 414, height: 568 },
]

describe("manage product mobile actions", () => {
  let fixtures: TFixtures

  beforeEach(() => {
    cy.task<TFixtures>("prepareFixtures").then(preparedFixtures => {
      fixtures = preparedFixtures
      cy.signIn(fixtures.owner)
    })
  })

  mobileViewports.forEach(({ width, height }) => {
    it(`keeps variant editing and save controls usable at ${width}×${height}`, () => {
      cy.viewport(width, height)
      cy.visit(`/en/products/${fixtures.ownerProduct.id}/manage`)

      cy.get('[data-cy="manage-product-page"]').should(page => {
        expect(getComputedStyle(page[0]).paddingLeft, "mobile page gutter").to.equal("0px")
        expect(getComputedStyle(page[0]).paddingRight, "mobile page gutter").to.equal("0px")
      })
      cy.get('[data-cy="manage-product-info-panel"]').should(panel => {
        expect(parseFloat(getComputedStyle(panel[0]).paddingLeft), "mobile section padding").to.be.at.most(8)
      })
      cy.get("#title").should("be.visible")
      cy.get("#title").then(title => {
        expect((title[0] as HTMLInputElement).labels, "title input has an associated label").to.have.length(1)
      })
      cy.get("#subTitle").then(description => {
        expect((description[0] as HTMLTextAreaElement).labels, "description input has an associated label").to.have.length(1)
      })
      cy.get('[data-cy="manage-save"]').should("be.disabled")
      cy.get('[data-cy="manage-variant-label"]').type("Mobile size")
      cy.get('[data-cy="manage-variant-price"]').type("25")
      cy.get('[data-cy="manage-add-variant"]').scrollIntoView().should("be.visible").click()

      cy.get('[data-cy="manage-remove-variant"]').should("be.visible")
      cy.get('[data-cy="manage-save"]').scrollIntoView().should("be.visible").and("be.enabled")
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      })

      cy.get('[data-cy="manage-remove-variant"]').click()
      cy.get('[data-cy="manage-remove-variant"]').should("not.exist")
      cy.get('[data-cy="manage-save"]').should("be.disabled")
      cy.document().should(document => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      })
    })
  })
})

export {}
