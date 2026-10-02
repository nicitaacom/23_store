import { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"

export function getProductProcessingPluralForm(count: number, locale: TLocaleTag): "one" | "few" | "other" {
  const pluralForm = new Intl.PluralRules(locale === "se" ? "sv" : locale).select(count)
  return pluralForm === "one" || pluralForm === "few" ? pluralForm : "other"
}
