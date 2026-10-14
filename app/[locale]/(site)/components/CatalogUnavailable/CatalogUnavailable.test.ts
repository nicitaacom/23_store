import { createElement } from "react"
import { PassThrough } from "node:stream"
import { renderToPipeableStream } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { CatalogUnavailable } from "./CatalogUnavailable"
import { I18nProviderClient } from "@/locales/client"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

function renderDatabaseError(locale: TLocaleTag) {
  return new Promise<string>((resolve, reject) => {
    const output = new PassThrough()
    let markup = ""
    output.on("data", chunk => {
      markup += chunk.toString()
    })
    output.on("end", () => resolve(markup))
    output.on("error", reject)
    const stream = renderToPipeableStream(
      createElement(
        I18nProviderClient,
        { locale } as Parameters<typeof I18nProviderClient>[0],
        createElement(CatalogUnavailable, {
          databaseMessage: "no available server\n",
          databaseStatus: 503,
          autoRecover: true,
        }),
      ),
      {
        onAllReady() {
          stream.pipe(output)
        },
        onError: reject,
      },
    )
  })
}

afterEach(() => vi.unstubAllEnvs())

describe("database failure in the selected language", () => {
  const cases: [TLocaleTag, string, string][] = [
    ["en", "Product database request failed", "The configured database service reported that no server is available."],
    ["fi", "Tuotetietokannan pyyntö epäonnistui", "Määritetty tietokantapalvelu ilmoitti, ettei palvelinta ole käytettävissä."],
    ["ru", "Ошибка запроса к базе данных товаров", "Настроенная служба базы данных сообщила, что доступных серверов нет."],
    [
      "se",
      "Förfrågan till produktdatabasen misslyckades",
      "Den konfigurerade databastjänsten rapporterade att ingen server är tillgänglig.",
    ],
  ]

  it.each(cases)("renders the actual failure entirely in %s", async (locale, title, cause) => {
    vi.stubEnv("NODE_ENV", "development")
    const markup = await renderDatabaseError(locale)

    expect(markup).toContain(title)
    expect(markup).toContain(cause)
    expect(markup).toContain("503")
    expect(markup).toContain("NEXT_PUBLIC_SUPABASE_URL")
    expect(markup).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    expect(markup).not.toContain("no available server")
    expect(markup).not.toContain("{message: ...}")
    for (const [otherLocale, otherTitle, otherCause] of cases) {
      if (otherLocale !== locale) {
        expect(markup).not.toContain(otherTitle)
        expect(markup).not.toContain(otherCause)
      }
    }
  })
})
