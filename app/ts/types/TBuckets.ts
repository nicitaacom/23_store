/**
 * One bucket per purpose. The folder inside each one is the uploader's slugified email
 * (nicitaacom@gmail.com -> nicitaacomgmailcom) or, for a visitor who is not signed in, their
 * deviceId - never auth.users.id, which is minted again whenever a 23_users row is restored into a
 * different Supabase project. See dev_readme-supbase-sql.md "SQL query for buckets + policies".
 *
 * ```
 * 23_product-images/
 * └── nicitaacomgmailcom/
 *     └── prod_T1IRAxDEq5VtEmno/            productId - the one folder to delete with the product
 *         ├── slivki-30pct-1.jpg            name = slug(fi title)-N, never the pasted file's name
 *         └── slivki-30pct-2.jpg
 *
 * 23_ai-product-images/
 * ├── nicitaacomgmailcom/                   signed in: slugifyEmail(email)
 * │   └── generated-image.png
 * └── Q5UUMP4MX0LbwF0Eekm3JIeIBwqWeDX0-/    not signed in: the deviceId, transport form
 *     └── generated-image.png
 *
 * 23_avatar-images/
 * └── nicitaacomgmailcom/
 *     └── avatar.png                        one file per account, upsert: true
 *
 * 23_support-images/
 * └── nicitaacomgmailcom/
 *     └── 2026-07-29_at_22-19-54.png        a paste has no name worth keeping, so the moment it
 *                                           arrived is the name (Europe/Berlin)
 *
 * 23_support-guest-images/                  the one bucket with an expiry, see the pg_cron job below
 * └── Q5UUMP4MX0LbwF0Eekm3JIeIBwqWeDX0-/    same visitor, same folder, every visit
 *     └── 2026-07-29_at_22-20-11.png
 *
 * 23_product-personalization-images/
 * └── nicitaacomgmailcom/
 *     └── prod_T1IRAxDEq5VtEmno/
 *         └── my-kovrik.jpg                 the buyer picked this file, so its own name is kept
 * ```
 *
 * `23_support-guest-images` is swept every week - the `cleanup_guest_support_images` pg_cron job,
 * Sunday 03:00 UTC, deletes every object in it that no `23_messages.images` entry still points at
 * and that is older than 1 hour. A guest's ticket is deleted after a month of silence and that
 * cascades to `23_messages`, so without the sweep the file would stay behind for good. No other
 * bucket is swept. See dev_readme-supbase-sql.md "GUEST SUPPORT IMAGES CLEANUP".
 */
export type TBuckets =
  | "23_support-guest-images"
  | "23_support-images"
  | "23_avatar-images"
  | "23_product-images"
  | "23_ai-product-images"
  | "23_product-personalization-images"
