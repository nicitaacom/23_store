import english from "../../app/locales/en"
import finnish from "../../app/locales/fi"
import { formatCurrency } from "../../app/utils/currencyFormatter"
import russian from "../../app/locales/ru"
import swedish from "../../app/locales/se"

function getTranslationKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix]

  return Object.entries(value).flatMap(([key, nestedValue]) => getTranslationKeys(nestedValue, prefix ? `${prefix}.${key}` : key))
}

describe("internationalization", () => {
  it("keeps every locale aligned with the English translation keys", () => {
    const expectedKeys = getTranslationKeys(english).sort()
    const locales = { fi: finnish, ru: russian, se: swedish }

    Object.entries(locales).forEach(([locale, translations]) => {
      expect(getTranslationKeys(translations).sort(), `${locale} translation keys`).to.deep.equal(expectedKeys)
    })
  })

  it("formats currency with each supported locale", () => {
    const localeMappings = { en: "en-US", fi: "fi-FI", ru: "ru-RU", se: "sv-SE" }

    Object.entries(localeMappings).forEach(([locale, intlLocale]) => {
      const expectedValue = new Intl.NumberFormat(intlLocale, { currency: "USD", style: "currency" }).format(1234.5)
      expect(formatCurrency(1234.5, locale), `${locale} currency`).to.equal(expectedValue)
    })
  })

  it("persists a selected language after navigation and refresh", () => {
    cy.intercept("POST", "/api/messages/get-messages").as("getMessages")
    cy.intercept("POST", "/").as("trackVisit")
    cy.visit("/")
    cy.wait(["@getMessages", "@trackVisit"])

    cy.get('[data-cy="language-trigger"]').first().click()
    cy.get('[data-cy="language-en"]').first().click()

    cy.getCookie("Next-Locale").should("have.property", "value", "en")
    cy.get('[data-cy="language-trigger"]').first().should("contain.text", "en")
    cy.wait("@trackVisit")

    cy.reload()
    cy.wait("@trackVisit")
    cy.get('[data-cy="language-trigger"]').first().should("contain.text", "en")
    cy.document().its("documentElement.lang").should("equal", "en")
  })
})

export {}
