// A slug is lowercase letters, digits and single "-" separators only, so a Storage path built from
// one never needs percent-encoding inside a URL: "сливки 30%" -> "slivki-30pct".
//
// Two rules are spelled out rather than left to a generic cleanup:
//   %  becomes "pct", so "30%" and "30" stay different names instead of both ending as "30"
//   letters outside a-z are transliterated, so a Russian or Finnish title keeps its word instead
//   of being stripped down to its digits
const TRANSLITERATIONS: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  і: "i", ї: "i", є: "e", ґ: "g",
  ß: "ss", ø: "o", æ: "ae", œ: "oe", đ: "d", ł: "l", þ: "th", ð: "d",
}

// Combining marks left behind by NFD, which is what turns ä/ö/å/é into a/o/a/e.
const COMBINING_MARKS = /[\u0300-\u036f]/g

export function slugify(value: string): string {
  const transliterated = Array.from(value.toLowerCase())
    .map(character => TRANSLITERATIONS[character] ?? character)
    .join("")

  return transliterated
    .replace(/%/g, "pct")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * An email address as a Storage folder name: "@" and "." are removed with nothing in their place,
 * everything lowercased - nicitaacom@gmail.com -> nicitaacomgmailcom.
 *
 * This is the one identity a folder name may be keyed on. auth.users.id is minted again for the
 * same person whenever their 23_users row is restored into another Supabase project, so every
 * folder created under the old uuid would stay behind; an account holds exactly one email, for
 * good, and linking a second login provider only ever succeeds under that same email.
 */
export function slugifyEmail(email: string): string {
  return slugify(email).replace(/-/g, "")
}
