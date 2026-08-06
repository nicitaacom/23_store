// One bucket per purpose. The folder inside each one is the uploader's slugified email
// (nicitaacom@gmail.com -> nicitaacomgmailcom) or, for a visitor who is not signed in, their
// deviceId - never auth.users.id, which is minted again whenever a 23_users row is restored into a
// different Supabase project. See dev_readme-supbase-sql.md "SQL query for buckets + policies".
export type TBuckets =
  | "23_support-guest-images"
  | "23_support-images"
  | "23_avatar-images"
  | "23_product-images"
  | "23_ai-product-images"
  | "23_product-personalization-images"
