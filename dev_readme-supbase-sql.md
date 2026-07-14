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

CREATE INDEX IF NOT EXISTS idx_utm_stats_created_at ON public.utm_stats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utm_stats_user_id    ON public.utm_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_utm_stats_source     ON public.utm_stats(source);
CREATE INDEX IF NOT EXISTS idx_utm_stats_campaign   ON public.utm_stats(campaign);

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
