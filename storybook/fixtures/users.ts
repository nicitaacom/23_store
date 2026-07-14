import type { User } from "@supabase/supabase-js";

import { FIXTURE_DATE, FIXTURE_IDS, FIXTURE_IMAGES } from "./constants";

export const customerUser: User = {
  id: FIXTURE_IDS.user,
  aud: "authenticated",
  role: "authenticated",
  email: "customer@example.test",
  email_confirmed_at: FIXTURE_DATE,
  phone: "",
  confirmed_at: FIXTURE_DATE,
  last_sign_in_at: FIXTURE_DATE,
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { avatar_url: FIXTURE_IMAGES.avatar, username: "customer" },
  identities: [],
  created_at: FIXTURE_DATE,
  updated_at: FIXTURE_DATE,
  is_anonymous: false,
};

export const ownerUser: User = {
  ...customerUser,
  id: FIXTURE_IDS.owner,
  email: "owner@example.test",
  user_metadata: { avatar_url: FIXTURE_IMAGES.avatar, username: "owner" },
};
