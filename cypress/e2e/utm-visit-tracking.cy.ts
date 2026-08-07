// Needs DEVICE_ID_ENCRYPTION_KEY in .env.local (64 hex chars) plus the UPSTASH_REDIS_* pair, since a
// visit resolves its deviceId through the cookie crypto and the Redis layers.
// Run with: pnpm test:e2e  (or pnpm dev + pnpm cypress:open)

type TUTMVisitRow = {
  id: string
  user_id: string
  created_at: string
  source: string | null
  medium: string | null
  campaign: string | null
  url: string | null
  user_agent: string | null
}

type TUTMVisitLookup = {
  deviceId: string | null
  isValidDeviceId: boolean
  visits: TUTMVisitRow[]
}

const DEVICE_ID_STORE_KEY = "deviceIdStore"
const DEVICE_ID_COOKIE_NAME = "23_did"
const DEVICE_ID_SHAPE = /^23-[0-9a-zA-Z]{21}-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/
const TYPED_DEVICE_ID = "23-mine"
const CAMPAIGN_URL = "/en?utm_source=cypress-source&utm_medium=cypress-medium&utm_campaign=cypress-campaign"

const trackedUserIds: string[] = []

function readPersistedStoredDeviceId(appWindow: Window): string | null {
  const persistedStore = appWindow.localStorage.getItem(DEVICE_ID_STORE_KEY)
  if (!persistedStore) return null

  return JSON.parse(persistedStore).state.storedDeviceId
}

// retries until the tracker has answered and the zustand store has persisted the transport form
function readStoredDeviceId() {
  return cy
    .window()
    .should(appWindow => {
      expect(readPersistedStoredDeviceId(appWindow), `${DEVICE_ID_STORE_KEY} holds a stored deviceId`)
        .to.be.a("string")
        .and.not.equal("")
    })
    .then(appWindow => readPersistedStoredDeviceId(appWindow) as string)
}

// the typed value is already a string, so waiting for "any string" would resolve before the server
// answered - this waits for the value the server writes back over it
function readStoredDeviceIdAfter(previousStoredDeviceId: string) {
  return cy
    .window()
    .should(appWindow => {
      expect(readPersistedStoredDeviceId(appWindow), "the stored deviceId the server wrote back")
        .to.be.a("string")
        .and.not.equal(previousStoredDeviceId)
    })
    .then(appWindow => readPersistedStoredDeviceId(appWindow) as string)
}

// the URL cleanup runs after the visit has been sent, so an empty utm_source proves tracking finished
function waitForTrackingToFinish() {
  return cy.location("search").should("not.contain", "utm_source")
}

function readVisits(storedDeviceId: string) {
  return cy.task<TUTMVisitLookup>("readUTMVisits", storedDeviceId).then(utmVisitLookup => {
    if (utmVisitLookup.deviceId) trackedUserIds.push(utmVisitLookup.deviceId)

    return utmVisitLookup
  })
}

describe("UTM visit tracking", () => {
  // Clearing cookies and localStorage between tests is not enough for a test that needs a row of its own:
  // the machine keeps its fingerprint, so layer 4 hands every test the same deviceId and the once-per-day
  // dedup then refuses the row this test is looking for. Emptying the day is what makes them independent.
  beforeEach(() => {
    cy.task("deleteVisitsFromTodayForTestHost")
  })

  afterEach(() => {
    while (trackedUserIds.length > 0) {
      cy.task("deleteUTMVisitsForUserId", trackedUserIds.pop())
    }
  })

  it("records one row with the campaign the visitor arrived with", () => {
    cy.visit(`${CAMPAIGN_URL}&utm_term=cypress-term&utm_content=cypress-content`)
    waitForTrackingToFinish()

    readStoredDeviceId().then(storedDeviceId => {
      readVisits(storedDeviceId).then(({ deviceId, isValidDeviceId, visits }) => {
        expect(isValidDeviceId, "the stored value decodes to an id this server signed").to.equal(true)
        expect(deviceId, "deviceId shape").to.match(DEVICE_ID_SHAPE)
        expect(storedDeviceId, "the browser never holds the signed id").to.not.equal(deviceId)
        expect(storedDeviceId, "the transport form hides the prefix").to.not.match(/^23-/)

        expect(visits, "exactly one row for this device").to.have.length(1)
        expect(visits[0].source).to.equal("cypress-source")
        expect(visits[0].medium).to.equal("cypress-medium")
        expect(visits[0].campaign).to.equal("cypress-campaign")
        expect(visits[0].url, "the landing URL is stored as it arrived").to.contain("utm_source=cypress-source")
        expect(JSON.parse(visits[0].user_agent as string).userAgent, "visit metadata").to.be.a("string")
      })
    })
  })

  // /fi, not /en: `en` is the default locale and is served at "/", so a path assertion on /en would be
  // asserting the locale redirect rather than the cleanup keeping the path it was given.
  it("strips the utm params from the address bar and keeps the path and every other param", () => {
    cy.visit("/fi?utm_source=cypress-source&utm_medium=cypress-medium&modal=CartModal")
    waitForTrackingToFinish()

    cy.location("search").should("not.contain", "utm_medium")
    cy.location("search").should("contain", "modal=CartModal")
    cy.location("pathname").should("equal", "/fi")
    readStoredDeviceId().then(readVisits)
  })

  it("keeps the deviceId cookie httpOnly and encrypted, so page JS never reads an id out of it", () => {
    cy.visit(CAMPAIGN_URL)
    waitForTrackingToFinish()

    readStoredDeviceId().then(storedDeviceId => {
      readVisits(storedDeviceId).then(({ deviceId }) => {
        cy.getCookie(DEVICE_ID_COOKIE_NAME).should("exist")
        cy.getCookie(DEVICE_ID_COOKIE_NAME).should("have.property", "httpOnly", true)
        cy.getCookie(DEVICE_ID_COOKIE_NAME).then(deviceIdCookie => {
          expect(deviceIdCookie?.value, "the cookie holds ciphertext, not the readable id").to.not.equal(deviceId)
          expect(deviceIdCookie?.value).to.not.contain("23-")
        })
        cy.window().then(appWindow => {
          expect(appWindow.document.cookie, "page JS sees no deviceId cookie").to.not.contain(DEVICE_ID_COOKIE_NAME)
        })
      })
    })
  })

  it("counts a second visit on the same day as the same visit", () => {
    cy.visit(CAMPAIGN_URL)
    waitForTrackingToFinish()

    readStoredDeviceId().then(firstStoredDeviceId => {
      cy.visit("/en?utm_source=cypress-source-again")
      waitForTrackingToFinish()

      readStoredDeviceId().then(secondStoredDeviceId => {
        expect(secondStoredDeviceId, "the same device keeps its id").to.equal(firstStoredDeviceId)

        readVisits(secondStoredDeviceId).then(({ visits }) => {
          expect(visits, "still one row for the visitor day").to.have.length(1)
          expect(visits[0].source, "the first arrival is the one that counts").to.equal("cypress-source")
        })
      })
    })
  })

  it("records a visit with no utm params as organic / direct", () => {
    cy.visit("/en")

    readStoredDeviceId().then(storedDeviceId => {
      readVisits(storedDeviceId).then(({ visits }) => {
        expect(visits).to.have.length(1)
        expect(visits[0].source).to.equal("organic")
        expect(visits[0].medium).to.equal("direct")
        expect(visits[0].campaign).to.equal(null)
      })
    })
  })

  it("refuses a hand-typed localStorage id and writes the real one back over it", () => {
    cy.visit(CAMPAIGN_URL)
    waitForTrackingToFinish()

    readStoredDeviceId().then(realStoredDeviceId => {
      cy.window().invoke(
        "localStorage.setItem",
        DEVICE_ID_STORE_KEY,
        JSON.stringify({ state: { storedDeviceId: TYPED_DEVICE_ID }, version: 0 }),
      )
      cy.visit("/en?utm_source=cypress-source-typed")

      readStoredDeviceIdAfter(TYPED_DEVICE_ID).then(storedDeviceIdAfterEdit => {
        expect(storedDeviceIdAfterEdit, "the typed value is replaced by the real id").to.equal(realStoredDeviceId)

        readVisits(storedDeviceIdAfterEdit).then(({ isValidDeviceId, visits }) => {
          expect(isValidDeviceId, "the value written back is a signed id").to.equal(true)
          expect(visits, "no extra row for the invented visitor").to.have.length(1)
        })
        cy.task<TUTMVisitRow[]>("readUTMVisitsForUserId", TYPED_DEVICE_ID).then(typedIdVisits => {
          expect(typedIdVisits, "no row is ever written under a typed id").to.have.length(0)
        })
      })
    })
  })

  it("falls through a tampered deviceId cookie instead of failing the visit", () => {
    cy.setCookie(DEVICE_ID_COOKIE_NAME, "tampered-cookie-value", { sameSite: "lax" })
    cy.visit(CAMPAIGN_URL)
    waitForTrackingToFinish()

    readStoredDeviceId().then(storedDeviceId => {
      readVisits(storedDeviceId).then(({ isValidDeviceId, visits }) => {
        expect(isValidDeviceId).to.equal(true)
        expect(visits, "the visit is still recorded").to.have.length(1)
      })
      cy.getCookie(DEVICE_ID_COOKIE_NAME).then(deviceIdCookie => {
        expect(deviceIdCookie?.value, "the tampered cookie is replaced").to.not.equal("tampered-cookie-value")
      })
    })
  })

  it("re-identifies a visitor who cleared localStorage, through the httpOnly cookie", () => {
    cy.visit(CAMPAIGN_URL)
    waitForTrackingToFinish()

    readStoredDeviceId().then(firstStoredDeviceId => {
      cy.clearLocalStorage()
      cy.visit("/en")

      readStoredDeviceId().then(secondStoredDeviceId => {
        expect(secondStoredDeviceId, "layer 2 answered").to.equal(firstStoredDeviceId)

        readVisits(secondStoredDeviceId).then(({ visits }) => {
          expect(visits, "one visitor, one row").to.have.length(1)
        })
      })
    })
  })

  // Layer 4. Locally the request IP is 127.0.0.1, so layer 3 is skipped and the fingerprint is the only
  // thing left that recognises this machine. Needs a browser that renders to a canvas (Electron/Chrome do).
  it("re-identifies a visitor who cleared localStorage AND the cookie, through the fingerprint", () => {
    cy.visit(CAMPAIGN_URL)
    waitForTrackingToFinish()

    readStoredDeviceId().then(firstStoredDeviceId => {
      cy.clearLocalStorage()
      cy.clearCookie(DEVICE_ID_COOKIE_NAME)
      cy.visit("/en")

      readStoredDeviceId().then(secondStoredDeviceId => {
        expect(secondStoredDeviceId, "layer 4 answered inside its 10 minutes").to.equal(firstStoredDeviceId)

        readVisits(secondStoredDeviceId).then(({ visits }) => {
          expect(visits, "one visitor, one row").to.have.length(1)
        })
      })
    })
  })
})
