## DB tables

### utm_stats table (SHARED)

This project shares the `utm_stats` table with projects: 14_portfolio, 28_notion-clone, and 29_ai-companion.

```sql
-- =================================== 📊 utm_stats table (SHARED across 14, 23, 28, 29) ===================================
-- Unified UTM tracking across all portfolio projects
-- ⚠️ SHARED TABLE: Projects 14_portfolio, 23_store, 28_notion-clone, 29_ai-companion use this same utm_stats table
-- All UTM tracking data is aggregated in a single shared Supabase table

CREATE TABLE IF NOT EXISTS public.utm_stats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     TEXT NOT NULL,
  source      TEXT,
  medium      TEXT,
  campaign    TEXT,
  url         TEXT,
  user_agent  TEXT
);

-- Geo columns. Nullable on purpose: projects 14/28/29 keep writing only the JSON in `user_agent` and
-- keep working untouched - 23_store writes both and reads the column first, the JSON second.
ALTER TABLE public.utm_stats ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE public.utm_stats ADD COLUMN IF NOT EXISTS country      TEXT;
ALTER TABLE public.utm_stats ADD COLUMN IF NOT EXISTS region       TEXT;
ALTER TABLE public.utm_stats ADD COLUMN IF NOT EXISTS city         TEXT;

-- One-time backfill from the JSON already sitting in `user_agent`. Safe to re-run: it only fills rows
-- whose columns are still empty, and rows whose user_agent is not JSON are skipped by the ? test.
UPDATE public.utm_stats
SET country_code = COALESCE(country_code, NULLIF(user_agent::jsonb ->> 'countryCode', '')),
    country      = COALESCE(country,      NULLIF(user_agent::jsonb ->> 'country', '')),
    region       = COALESCE(region,       NULLIF(user_agent::jsonb ->> 'region', '')),
    city         = COALESCE(city,         NULLIF(user_agent::jsonb ->> 'city', ''))
WHERE user_agent IS NOT NULL
  AND user_agent LIKE '{%'
  AND (user_agent::jsonb) ? 'countryCode'
  AND (country_code IS NULL OR country IS NULL OR region IS NULL OR city IS NULL);

CREATE INDEX IF NOT EXISTS idx_utm_stats_created_at ON public.utm_stats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utm_stats_user_id    ON public.utm_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_utm_stats_source     ON public.utm_stats(source);
CREATE INDEX IF NOT EXISTS idx_utm_stats_campaign   ON public.utm_stats(campaign);
CREATE INDEX IF NOT EXISTS idx_utm_stats_country    ON public.utm_stats(country_code);

-- Before/after check for the period scan the stats page runs (plan-09 task 4). The created_at index
-- above already exists, so this is a measurement, not a change:
--   EXPLAIN ANALYZE SELECT id, user_id, created_at, source, medium, campaign, url, user_agent
--   FROM public.utm_stats
--   WHERE created_at >= date_trunc('month', NOW()) AND created_at < date_trunc('month', NOW()) + INTERVAL '1 month';
-- A "Seq Scan on utm_stats" line there means the planner ignores the index because the table is still
-- small - nothing to add, re-measure when the row count grows.

-- 🔐 RLS Policies
ALTER TABLE public.utm_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utm_stats' AND policyname = 'Allow select for everyone') THEN
        CREATE POLICY "Allow select for everyone" ON public.utm_stats FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utm_stats' AND policyname = 'Allow insert for everyone') THEN
        CREATE POLICY "Allow insert for everyone" ON public.utm_stats FOR INSERT WITH CHECK (true);
    END IF;
END
$$;

ALTER TABLE public.utm_stats FORCE ROW LEVEL SECURITY;

```

### SQL query: `tables` + `RLS` + `indexes`

```sql
-- 👥 Users Table (created first for foreign key dependencies)
-- id/owner_id/cart.id are UUID (authed users, FK to auth.users); existing text DBs: migration 20260619_convert_23_ids_text_to_uuid.sql.
-- id is UUID — only real authenticated users are inserted here (FK to auth.users). No anonymous rows.
CREATE TABLE IF NOT EXISTS public."23_users" (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT NULL,
  -- roles is TEXT[] so a user can hold multiple roles simultaneously e.g. ["ADMIN","SUPPORT"]
  roles TEXT[] NOT NULL DEFAULT '{"USER"}',
  email_confirmed_at TIMESTAMPTZ NULL,
  providers TEXT[] NULL DEFAULT '{}'
);

-- 🔐 RLS Policies for Users
ALTER TABLE public."23_users" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_users' AND policyname='Allow users to select their own row') THEN
    CREATE POLICY "Allow users to select their own row" ON public."23_users" FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;


-- 🎫 Tickets Table
CREATE TABLE IF NOT EXISTS public."23_tickets" (
  id TEXT NOT NULL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_open BOOLEAN NOT NULL DEFAULT true,
  owner_username TEXT NOT NULL,
  -- ⚠️ KEEP AS TEXT — do NOT change to UUID. Tickets can be opened by ANONYMOUS users
  -- whose owner_id is NOT an auth.users(id), so it cannot be a UUID FK.
  -- When comparing to auth.uid() (uuid) cast the uuid -> text: owner_id = auth.uid()::text
  -- (never owner_id::uuid = auth.uid() — that throws 22P02 on non-uuid anonymous ids).
  owner_id text not null,
  last_message_body TEXT NOT NULL DEFAULT '',
  owner_avatar_url TEXT NULL,
  rate INTEGER NULL
);

-- 🔐 RLS Policies for Tickets
ALTER TABLE public."23_tickets" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_tickets' AND policyname='SUPPORT/ADMIN all access') THEN
    CREATE POLICY "SUPPORT/ADMIN all access" ON public."23_tickets" FOR ALL USING (
      EXISTS (SELECT 1 FROM public."23_users" WHERE id = auth.uid() AND roles && ARRAY['SUPPORT', 'ADMIN'])
    );
  END IF;
END $$;

-- 💬 Messages Table
CREATE TABLE IF NOT EXISTS public."23_messages" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ticket_id TEXT NOT NULL REFERENCES public."23_tickets"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  -- ⚠️ sender_id is TEXT (no FK): an ANONYMOUS user can send a message, so it is NOT an auth.users(id).
  -- Do NOT add a FK to 23_users(id) (uuid) — text cannot reference uuid.
  sender_id TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  body TEXT NOT NULL,
  images TEXT[] NULL,
  seen BOOLEAN NOT NULL DEFAULT false,
  sender_avatar_url TEXT NULL
);

-- 🔐 RLS Policies for Messages
ALTER TABLE public."23_messages" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_messages' AND policyname='Allow insert for everyone') THEN
    CREATE POLICY "Allow insert for everyone" ON public."23_messages" FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_messages' AND policyname='SUPPORT/ADMIN select') THEN
    CREATE POLICY "SUPPORT/ADMIN select" ON public."23_messages" FOR SELECT USING (
      EXISTS (SELECT 1 FROM public."23_users" WHERE id = auth.uid() AND roles && ARRAY['SUPPORT', 'ADMIN'])
    );
  END IF;
END $$;

-- 🏷️ Categories Table
-- parent_id = NULL means root/parent category; subcategories reference their parent
CREATE TABLE IF NOT EXISTS public."23_categories" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  parent_id UUID NULL REFERENCES public."23_categories"(id) ON DELETE SET NULL
);

ALTER TABLE public."23_categories" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_categories' AND policyname='All users select') THEN
    CREATE POLICY "All users select" ON public."23_categories" FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_categories' AND policyname='Admin insert') THEN
    CREATE POLICY "Admin insert" ON public."23_categories" FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public."23_users" WHERE id = auth.uid() AND roles && ARRAY['ADMIN'])
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_categories' AND policyname='Admin update') THEN
    CREATE POLICY "Admin update" ON public."23_categories" FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public."23_users" WHERE id = auth.uid() AND roles && ARRAY['ADMIN'])
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_categories' AND policyname='Admin delete') THEN
    CREATE POLICY "Admin delete" ON public."23_categories" FOR DELETE USING (
      EXISTS (SELECT 1 FROM public."23_users" WHERE id = auth.uid() AND roles && ARRAY['ADMIN'])
    );
  END IF;
END $$;

-- 👁️ Category Views Table — per-user click counts for pill bar personalization
-- user_id TEXT (not UUID FK) — same pattern as 23_tickets, supports anonymous IDs
CREATE TABLE IF NOT EXISTS public."23_category_views" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public."23_categories"(id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 1,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_23_category_views_user_id ON public."23_category_views"(user_id);
CREATE INDEX IF NOT EXISTS idx_23_category_views_category_id ON public."23_category_views"(category_id);

ALTER TABLE public."23_category_views" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_category_views' AND policyname='User select own') THEN
    CREATE POLICY "User select own" ON public."23_category_views"
      FOR SELECT USING (user_id = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_category_views' AND policyname='Allow insert for everyone') THEN
    CREATE POLICY "Allow insert for everyone" ON public."23_category_views"
      FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_category_views' AND policyname='User update own') THEN
    CREATE POLICY "User update own" ON public."23_category_views"
      FOR UPDATE USING (user_id = auth.uid()::text);
  END IF;
END $$;

-- 🛒 Products Table
CREATE TABLE IF NOT EXISTS public."23_products" (
  price_id VARCHAR NOT NULL,
  id VARCHAR NOT NULL,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  price NUMERIC NOT NULL, -- base price, used when no variant selected
  img_url VARCHAR[] NOT NULL,
  on_stock INTEGER NOT NULL, -- with variants = sum of variant quantities (auto); without variants = manual
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  variants JSONB NULL, -- [{id, label, image_url, price, quantity}]; quantity 0 = sold out
  likes_count INTEGER NOT NULL DEFAULT 0, -- popular = ORDER BY likes_count DESC
  rating_sum INTEGER NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0, -- avg = rating_sum / rating_count
  category_id UUID NULL REFERENCES public."23_categories"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (price_id, owner_id, id)
);

-- 🔐 RLS Policies for Products
ALTER TABLE public."23_products" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_products' AND policyname='All users select') THEN
    CREATE POLICY "All users select" ON public."23_products" FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_products' AND policyname='Owner delete') THEN
    CREATE POLICY "Owner delete" ON public."23_products" FOR DELETE USING (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_products' AND policyname='Owner update') THEN
    CREATE POLICY "Owner update" ON public."23_products" FOR UPDATE USING (owner_id = auth.uid());
  END IF;
END $$;

-- 👉 TODO — LIVE SUPABASE: Run this DROP/CREATE block in Dashboard → SQL Editor.
-- This is the only manual update required; no environment variable or application-code change is
-- required after it succeeds.
-- Request-bound Supabase clients send the user's JWT, so this policy enforces product ownership.
-- Replacing the former role-only policy prevents an authenticated user from inserting another
-- user's owner_id through the direct Supabase REST API.
DROP POLICY IF EXISTS "Auth insert" ON public."23_products";
DROP POLICY IF EXISTS "Owner insert" ON public."23_products";
CREATE POLICY "Owner insert" ON public."23_products"
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

-- Verify that the result contains Owner insert / INSERT / {authenticated} and the owner_id check.
SELECT policyname, cmd, roles, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = '23_products' AND policyname = 'Owner insert';

-- 🛍️ Users Cart Table
CREATE TABLE IF NOT EXISTS public."23_users_cart" (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cart_products JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 🔐 RLS Policies for Users Cart
ALTER TABLE public."23_users_cart" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_users_cart' AND policyname='Allow users to select their own cart') THEN
    CREATE POLICY "Allow users to select their own cart" ON public."23_users_cart" FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_users_cart' AND policyname='Allow users to update their own cart') THEN
    CREATE POLICY "Allow users to update their own cart" ON public."23_users_cart" FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;
-- 📊 UTM Stats Table (tracking marketing campaign performance)
CREATE TABLE IF NOT EXISTS public.utm_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  utm_source VARCHAR NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT utm_stats_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

ALTER TABLE utm_stats ENABLE ROW LEVEL SECURITY;
```

### SQL query for buckets + policies

```sql
-- =================================== STORAGE BUCKETS ===================================

-- Create 23_public-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('23_public-images', '23_public-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for 23_public-images bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'allow_insert_for_everyone_23_public_images') THEN
    CREATE POLICY "allow_insert_for_everyone_23_public_images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = '23_public-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'allow_select_for_everyone_23_public_images') THEN
    CREATE POLICY "allow_select_for_everyone_23_public_images" ON storage.objects
    FOR SELECT USING (bucket_id = '23_public-images');
  END IF;
END $$;

-- Create 23_avatar-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('23_avatar-images', '23_avatar-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for 23_avatar-images bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'allow_insert_for_everyone_23_avatar_images') THEN
    CREATE POLICY "allow_insert_for_everyone_23_avatar_images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = '23_avatar-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'allow_select_for_everyone_23_avatar_images') THEN
    CREATE POLICY "allow_select_for_everyone_23_avatar_images" ON storage.objects
    FOR SELECT USING (bucket_id = '23_avatar-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'allow_update_for_everyone_23_avatar_images') THEN
    CREATE POLICY "allow_update_for_everyone_23_avatar_images" ON storage.objects
    FOR UPDATE USING (bucket_id = '23_avatar-images');
  END IF;
END $$;

-- Public bucket policies (for '23_public' bucket)
DO $$
BEGIN
    -- Create '23_public' bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('23_public', '23_public', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

```

<br/>

## SQL query for functions

> Import restore order: `23_users → 23_users_cart → 23_categories → 23_category_views → 23_products → 23_tickets → 23_messages`

```sql
-- =================================== 🗄️ DB BACKUP ===================================

CREATE OR REPLACE FUNCTION public.backup_23_tables()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    '23_users',           (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_users" t),
    '23_users_cart',      (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_users_cart" t),
    '23_categories',      (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_categories" t),
    '23_category_views',  (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_category_views" t),
    '23_products',        (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_products" t),
    '23_tickets',         (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_tickets" t),
    '23_messages',        (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_messages" t)
  );
$$;

REVOKE ALL ON FUNCTION public.backup_23_tables() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.backup_23_tables() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backup_23_tables() TO service_role;

-- =================================== ❤️ PRODUCT LIKES / ⭐ RATINGS ===================================

CREATE OR REPLACE FUNCTION public.increment_product_likes(p_id VARCHAR, delta INTEGER)
RETURNS INTEGER
LANGUAGE sql
AS $$
  UPDATE public."23_products"
  SET likes_count = GREATEST(0, likes_count + delta)
  WHERE id = p_id
  RETURNING likes_count;
$$;

CREATE OR REPLACE FUNCTION public.add_product_rating(p_id VARCHAR, stars INTEGER)
RETURNS public."23_products"
LANGUAGE sql
AS $$
  UPDATE public."23_products"
  SET rating_sum = rating_sum + LEAST(5, GREATEST(1, stars)),
      rating_count = rating_count + 1
  WHERE id = p_id
  RETURNING *;
$$;

GRANT EXECUTE ON FUNCTION public.increment_product_likes(VARCHAR, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_product_rating(VARCHAR, INTEGER) TO anon, authenticated;

-- =================================== ↻ REPLENISHMENT REQUESTS ===================================
-- How many buyers asked the owner to restock a sold-out product. One column on the product, raised
-- by one per click on "Request replenishment" (app/components/Product/RequestReplanishmentButton.tsx).

ALTER TABLE public."23_products"
  ADD COLUMN IF NOT EXISTS replanishment_requests_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_product_replanishment_requests(p_id VARCHAR)
RETURNS INTEGER
LANGUAGE sql
AS $$
  UPDATE public."23_products"
  SET replanishment_requests_count = replanishment_requests_count + 1
  WHERE id = p_id
  RETURNING replanishment_requests_count;
$$;

GRANT EXECUTE ON FUNCTION public.increment_product_replanishment_requests(VARCHAR) TO anon, authenticated;

-- =================================== 🖼️ PRODUCT PERSONALIZATION ===================================
-- Print area (in mm) + the mockup image + the rectangle on that mockup where the print lands.
-- Per-variant overrides are keyed by the variant id that already lives in "23_products".variants,
-- because variants are the size axis (S/M/L, 30x40 vs 50x70).
--   { "isEnabled": true,
--     "defaultConfig": { "mockupUrl": "...",
--                        "printArea":  {"widthMm":900,"heightMm":400,"minDpi":150},
--                        "mockupRect": {"leftPct":6.2,"topPct":12.4,"widthPct":87.6,"heightPct":39.0} },
--     "variantConfigs": { "<variantId>": { ...same shape... } } }
-- mockupRect is in % of the mockup image, so the preview overlay is the true print area at any screen size.

ALTER TABLE public."23_products"
  ADD COLUMN IF NOT EXISTS personalization JSONB NULL;

-- What the buyer uploaded, so the owner has the file to print after checkout.
-- user_id is TEXT: anonymous buyers use anonymousId_<uuid>, same as "23_tickets".owner_id.
-- owner_id is copied from the product so the owner lists their print jobs without a join.
CREATE TABLE IF NOT EXISTS public."23_personalized_designs" (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id          TEXT NOT NULL,
  owner_id         UUID NOT NULL REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  product_id       VARCHAR NOT NULL,
  variant_id       TEXT NULL,
  source_url       TEXT NOT NULL,
  source_width_px  INTEGER NOT NULL,
  source_height_px INTEGER NOT NULL,
  print_width_mm   NUMERIC NOT NULL,
  print_height_mm  NUMERIC NOT NULL,
  placement        JSONB NOT NULL DEFAULT '{"scale":1,"offsetXPct":0,"offsetYPct":0}'::jsonb,
  effective_dpi    INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft'
);

CREATE INDEX IF NOT EXISTS idx_23_personalized_designs_owner ON public."23_personalized_designs"(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_23_personalized_designs_user  ON public."23_personalized_designs"(user_id);

ALTER TABLE public."23_personalized_designs" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_personalized_designs' AND policyname='Anyone insert') THEN
    CREATE POLICY "Anyone insert" ON public."23_personalized_designs" FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_personalized_designs' AND policyname='Buyer or owner select') THEN
    CREATE POLICY "Buyer or owner select" ON public."23_personalized_designs" FOR SELECT
      USING (user_id = auth.uid()::text OR owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_personalized_designs' AND policyname='Owner update') THEN
    CREATE POLICY "Owner update" ON public."23_personalized_designs" FOR UPDATE USING (owner_id = auth.uid());
  END IF;
END $$;

-- Switch personalization on for one product to try it before the admin form exists.
-- Replace the mockup URL, the mm, the percentages and the product id.
--   UPDATE public."23_products"
--   SET personalization = jsonb_build_object(
--     'isEnabled', true,
--     'defaultConfig', jsonb_build_object(
--       'mockupUrl',  'https://<project>.supabase.co/storage/v1/object/public/23_public-images/mockups/mousepad.png',
--       'printArea',  jsonb_build_object('widthMm', 900, 'heightMm', 400, 'minDpi', 150),
--       'mockupRect', jsonb_build_object('leftPct', 6.2, 'topPct', 12.4, 'widthPct', 87.6, 'heightPct', 39.0)
--     )
--   )
--   WHERE id = '<prod_xxx>';

-- =================================== 👁️ CATEGORY VIEWS ===================================

CREATE OR REPLACE FUNCTION public.increment_category_view(p_user_id TEXT, p_category_id UUID, p_delta INTEGER DEFAULT 1)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO public."23_category_views" (user_id, category_id, view_count, last_viewed_at)
  VALUES (p_user_id, p_category_id, p_delta, NOW())
  ON CONFLICT (user_id, category_id)
  DO UPDATE SET
    view_count = "23_category_views".view_count + p_delta,
    last_viewed_at = NOW();
$$;

GRANT EXECUTE ON FUNCTION public.increment_category_view(TEXT, UUID, INTEGER) TO anon, authenticated;
```

<br/>

## ANONYMOUS TICKETS CLEANUP

Anonymous visitors open tickets with `owner_id = anonymousId_<uuid>` (see `app/utils/setAnonymousId.ts`) —
these ids have no row in `23_users` by design, so `23_tickets.owner_id` and `23_messages.sender_id` are
TEXT with no FK (see the column comments above). A daily `pg_cron` job deletes an anonymous ticket once its
owner has been inactive for 1 month. Only messages **written by the anonymous owner**
(`message.sender_id = ticket.owner_id`) count as activity — a support reply alone does not keep the ticket
alive. Deleting the ticket cascades to `23_messages` via `23_messages_ticket_id_fkey` (`ON DELETE CASCADE`),
so the anonymous owner's messages and any support replies on that ticket are removed with it. Tickets owned
by signed-in users (`owner_id` not `LIKE 'anonymousId_%'`) are never touched.

Run this on a fresh Supabase project (or to test what would be deleted right now — SELECT only, deletes
nothing):

```sql
-- =================================== 🧹 ANONYMOUS TICKETS CLEANUP ===================================

-- Test first, by hand: which anonymous tickets would be deleted right now?
SELECT ticket.id, ticket.owner_id, ticket.owner_username, ticket.created_at
FROM public."23_tickets" ticket
WHERE ticket.owner_id LIKE 'anonymousId_%'
  AND NOT EXISTS (
    SELECT 1 FROM public."23_messages" message
    WHERE message.ticket_id = ticket.id
      AND message.sender_id = ticket.owner_id -- only the anonymous user's own messages count as activity
      AND message.created_at > NOW() - INTERVAL '1 month'
  );

-- Schedule the daily cleanup job (idempotent — safe to re-run)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('cleanup_anonymous_tickets')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_anonymous_tickets');

SELECT cron.schedule('cleanup_anonymous_tickets', '0 3 * * *', $$
  DELETE FROM public."23_tickets" ticket
  WHERE ticket.owner_id LIKE 'anonymousId_%'
    AND NOT EXISTS (
      SELECT 1 FROM public."23_messages" message
      WHERE message.ticket_id = ticket.id
        AND message.sender_id = ticket.owner_id -- only the anonymous user's own messages count as activity
        AND message.created_at > NOW() - INTERVAL '1 month'
    );
$$);
```

<br/>

## Email templates

<details> <summary><b>Verify your email</b></summary>

```html
<table style="max-width: 640px; width: 100%;background-color:rgb(32,32,32)" align="center">
  <table style="min-width:100%;margin:0rem;padding:1rem 0rem;text-align:center">
    <tbody>
      <tr>
        <td></td>
      </tr>
    </tbody>
  </table>

  <tr>
    <td style="text-align:center">
      <img src="https://i.imgur.com/KmMEBux.png" alt="" style="width: 40%;" />
    </td>
  </tr>
  <tr>
    <td style="font-weight: bold; text-align:center;font-size: 18px; color: #666666; padding: 10px 0;">
      Verify your email on joki
    </td>
  </tr>
  <tr>
    <td style="text-align: center;">
      <a
        href="{{ .ConfirmationURL }}"
        style="display: inline-block; background-color: #4CAF50; color: #1f1f1f; padding: 10px 20px; text-align: center; text-decoration: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
        Verify email
      </a>
    </td>
  </tr>

  <table style="border-top:1px solid #999999;min-width:100%;margin:1rem 0rem;padding:1rem 0rem;text-align:center">
    <tbody>
      <tr>
        <td>
          <a
            href="http://localhost:3023/support"
            style="color:rgb(64,125,237);text-decoration:none;margin:0px;font-size:0.875rem;line-height:1.25rem;text-align:center;margin-right:1rem"
            target="_blank"
            data-saferedirecturl="https://www.google.com/url?q=http://localhost:8000/support&amp;source=gmail&amp;ust=1696683582414000&amp;usg=AOvVaw1cLGx1tiGtSp3MUWJAOiih"
            >Support</a
          >
          <a
            href="http://localhost:3023/feedback"
            style="color:rgb(64,125,237);text-decoration:none;margin:0px;font-size:0.875rem;line-height:1.25rem;text-align:center;margin-right:1rem"
            target="_blank"
            data-saferedirecturl="https://www.google.com/url?q=http://localhost:8000/feedback&amp;source=gmail&amp;ust=1696683582414000&amp;usg=AOvVaw2J2syDW1hX-6J6kkisMOBZ"
            >Feedback</a
          >
        </td>
      </tr>
    </tbody>
  </table>
</table>
```

</details>

## AI price proposals

Run this block before enabling the Pricing tab. Replace the two placeholder Vault values before scheduling the job.

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

ALTER TABLE public."23_users"
  ADD COLUMN IF NOT EXISTS ai_pricing_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public."23_products"
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ai_pricing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_price_baseline NUMERIC(12, 2);

ALTER TABLE public."23_products"
  DROP CONSTRAINT IF EXISTS products_ai_price_baseline_positive;
ALTER TABLE public."23_products"
  ADD CONSTRAINT products_ai_price_baseline_positive
  CHECK (ai_price_baseline IS NULL OR ai_price_baseline > 0);

CREATE TABLE IF NOT EXISTS public."23_ai_price_runs" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_key DATE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'skipped', 'failed')),
  model TEXT NOT NULL DEFAULT 'gpt-5.4-mini',
  openai_response_id TEXT,
  sources JSONB NOT NULL DEFAULT '[]'::JSONB,
  eligible_count INTEGER NOT NULL DEFAULT 0 CHECK (eligible_count >= 0),
  proposal_count INTEGER NOT NULL DEFAULT 0 CHECK (proposal_count >= 0),
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public."23_ai_price_proposals" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public."23_ai_price_runs"(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  owner_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  current_price NUMERIC(12, 2) NOT NULL CHECK (current_price > 0),
  baseline_price NUMERIC(12, 2) NOT NULL CHECK (baseline_price > 0),
  proposed_price NUMERIC(12, 2) NOT NULL CHECK (proposed_price > 0),
  proposed_variants JSONB,
  reasoning VARCHAR(300) NOT NULL CHECK (char_length(trim(reasoning)) BETWEEN 1 AND 300),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (run_id, product_id),
  CHECK (
    proposed_price BETWEEN round(baseline_price * 0.875, 2)
    AND round(baseline_price * 1.125, 2)
  )
);

CREATE INDEX IF NOT EXISTS ai_price_proposals_owner_status_created_idx
  ON public."23_ai_price_proposals" (owner_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_price_proposals_product_status_idx
  ON public."23_ai_price_proposals" (product_id, status);

ALTER TABLE public."23_ai_price_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."23_ai_price_proposals" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_price_runs_select_owner ON public."23_ai_price_runs";
CREATE POLICY ai_price_runs_select_owner
  ON public."23_ai_price_runs"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public."23_ai_price_proposals" proposal
      WHERE proposal.run_id = "23_ai_price_runs".id
        AND proposal.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ai_price_proposals_select_owner ON public."23_ai_price_proposals";
CREATE POLICY ai_price_proposals_select_owner
  ON public."23_ai_price_proposals"
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS ai_pricing_update_own_user ON public."23_users";
CREATE POLICY ai_pricing_update_own_user
  ON public."23_users"
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.approve_ai_price_proposal(
  p_proposal_id UUID,
  p_new_price_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proposal public."23_ai_price_proposals"%ROWTYPE;
  product public."23_products"%ROWTYPE;
BEGIN
  SELECT *
  INTO proposal
  FROM public."23_ai_price_proposals"
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF proposal.id IS NULL THEN
    RAISE EXCEPTION 'Price proposal not found';
  END IF;
  IF auth.uid() IS NULL OR proposal.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF proposal.status <> 'pending' THEN
    RAISE EXCEPTION 'Price proposal is no longer pending';
  END IF;

  SELECT *
  INTO product
  FROM public."23_products"
  WHERE id = proposal.product_id
  FOR UPDATE;

  IF product.id IS NULL OR product.owner_id <> proposal.owner_id THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  IF product.price <> proposal.current_price
    OR product.ai_price_baseline IS DISTINCT FROM proposal.baseline_price THEN
    RAISE EXCEPTION 'Product price changed after this proposal was created';
  END IF;
  IF proposal.proposed_price NOT BETWEEN round(proposal.baseline_price * 0.875, 2)
    AND round(proposal.baseline_price * 1.125, 2) THEN
    RAISE EXCEPTION 'Proposed price is outside the baseline band';
  END IF;

  UPDATE public."23_products"
  SET price = proposal.proposed_price,
      price_id = p_new_price_id,
      variants = proposal.proposed_variants
  WHERE id = product.id;

  UPDATE public."23_ai_price_proposals"
  SET status = 'approved', reviewed_at = NOW()
  WHERE id = proposal.id;

  UPDATE public."23_ai_price_proposals"
  SET status = 'expired', reviewed_at = NOW()
  WHERE product_id = product.id
    AND id <> proposal.id
    AND status = 'pending';

  RETURN jsonb_build_object(
    'product_id', product.id,
    'old_price_id', product.price_id,
    'price', proposal.proposed_price
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_ai_price_proposal(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_ai_price_proposal(UUID, TEXT) TO authenticated;

-- Replace the placeholders before the first run. Existing named secrets are preserved on reruns.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'price_webhook_base_url') THEN
    PERFORM vault.create_secret('https://YOUR_PRODUCTION_DOMAIN', 'price_webhook_base_url');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'price_webhook_secret') THEN
    PERFORM vault.create_secret('REPLACE_WITH_A_LONG_RANDOM_SECRET', 'price_webhook_secret');
  END IF;
END;
$$;

SELECT cron.unschedule('weekly_ai_price_proposals')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'weekly_ai_price_proposals'
);

SELECT cron.schedule('weekly_ai_price_proposals', '0 3 * * 1', $$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'price_webhook_base_url'
    ) || '/api/webhooks/prices',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'price_webhook_secret'
      ),
      'Content-Type',
      'application/json'
    ),
    body := '{}'::JSONB,
    timeout_milliseconds := 60000
  );
$$);
```

For other templates the same - jsut change text `Verify your email on jokik` and `Verify email`

<br/>

### Providers

`Email` `Google` `Github`

![supbase-providers](https://i.imgur.com/4ygbhD2.png)

<details> <summary><b>URL configuration</b></summary>

```

Site url - https://23-store.vercel.app

http://localhost:3023/\*\*

https://23-store.vercel.app/auth/callback/credentials

https://23-store.vercel.app/?modal=AuthModal&variant=resetPassword&code=**

https://23-store.vercel.app/error?error_description=**

https://23-store.vercel.app/**

https://23-store.vercel.app/auth/callback/oauth?provider=**

https://www.jokik.fi/**

```

</details>

<br/>

## Keys check cron

### 0. Why this exists

A third party revokes an API key — a Tinify quota reset, a Stripe rotation, a Google project
suspension — and nothing tells you. The first report is a buyer hitting a 500.

`.githooks/pre-push` catches it locally every 3 days, but that only reads the local dotenv file.
Vercel holds a separate copy of every variable, and the two drift. This cron is what checks **prod**.

### 1. What it does

```
pg_cron 'keys_check'  '0 4 * * *'   (fires daily, the const in code decides)
  │
  └─ pg_net → POST https://<prod domain>/api/webhooks/check-envs
                Authorization: Bearer <CRON_SECRET from the Vault>
                │
                └─ app/api/webhooks/check-envs/route.ts
                     ├─ last run newer than PROD_CHECK_EVERY_DAYS? → 200 {"skipped":true}
                     └─ otherwise run every probe, then on a failure:
                          Telegram message + email to NEXT_PUBLIC_SUPPORT_NOTIFICATION_EMAIL
```

**The schedule is daily on purpose.** `PROD_CHECK_EVERY_DAYS` in `app/utils/checkKeys.ts` is the real
gate, so moving from weekly to daily later is changing `7` to `1` in one TypeScript file — no SQL edit,
no re-scheduling, and no chance of the cron and the code disagreeing about the cadence.

### 2. Run this once

Replace both placeholder Vault values before scheduling the job. `keys_webhook_secret` must equal
`CRON_SECRET` in Vercel exactly, or every run answers 401.

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'keys_webhook_base_url') THEN
    PERFORM vault.create_secret('https://YOUR_PRODUCTION_DOMAIN', 'keys_webhook_base_url');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'keys_webhook_secret') THEN
    PERFORM vault.create_secret('REPLACE_WITH_THE_SAME_VALUE_AS_CRON_SECRET', 'keys_webhook_secret');
  END IF;
END;
$$;

SELECT cron.unschedule('keys_check')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'keys_check');

-- 04:00 UTC, an hour after weekly_ai_price_proposals, so the two never overlap
SELECT cron.schedule('keys_check', '0 4 * * *', $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'keys_webhook_base_url')
           || '/api/webhooks/check-envs',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'keys_webhook_secret'),
      'Content-Type',
      'application/json'
    ),
    body := '{}'::JSONB,
    timeout_milliseconds := 60000
  );
$$);
```

### 3. Check it worked

```sql
-- the job exists and is switched on
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'keys_check';

-- what the last few runs answered - 200 with {"ok":true} or {"skipped":true} is healthy
SELECT status, content, created FROM net._http_response ORDER BY created DESC LIMIT 5;

-- when pg_cron last fired it, and whether the SQL itself succeeded
SELECT status, return_message, start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'keys_check')
ORDER BY start_time DESC
LIMIT 5;
```

Or skip the wait and send the request yourself:

```bash
curl -s -X POST https://YOUR_PRODUCTION_DOMAIN/api/webhooks/check-envs \
  -H "Authorization: Bearer YOUR_CRON_SECRET" | jq
```

| Answer | Meaning |
| --- | --- |
| `{"ok":true,"checked":38}` | every name is good |
| `{"skipped":true,"daysSinceLastRun":0}` | already ran inside `PROD_CHECK_EVERY_DAYS` — the gate works |
| `{"ok":false,"failures":[...],"alerted":true}` | Telegram and the email went out |
| `{"ok":false,"alerted":false,"reason":"same names as last alert"}` | quiet on purpose, nothing new |
| `{"error":"Unauthorized"}` | the Vault secret and `CRON_SECRET` in Vercel differ |
| `{"error":"CRON_SECRET is not configured"}` | the variable is missing from Vercel Production |

### 4. Where the state lives

Not in Postgres — in Upstash, so there is no table and no `types_db.ts` edit:

```
keys-check:23:last-run     ISO timestamp   the PROD_CHECK_EVERY_DAYS gate reads this
keys-check:23:last-report  the report      the last answer, readable without a run
keys-check:23:last-alert   names + sentAt  what was already reported, so it stays quiet
```

`23` is in every key because projects 14/19/23/28/29 share one Upstash database — the same reason
`utm:23:device-id` has it. See `app/libs/keysCheckRedis.ts`.

### 5. Decision made AGAINST

**A weekly `'0 4 * * 1'` schedule.** Then the cadence lives in two places — the cron string and
`PROD_CHECK_EVERY_DAYS` — and they drift apart the first time one is changed without the other.
