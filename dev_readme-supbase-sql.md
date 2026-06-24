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

-- 🛒 Products Table
CREATE TABLE IF NOT EXISTS public."23_products" (
  price_id VARCHAR NOT NULL,
  id VARCHAR NOT NULL,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  price NUMERIC NOT NULL, -- base price, used when no variant selected
  img_url VARCHAR[] NOT NULL,
  on_stock INTEGER NOT NULL, -- product-level stock (used when product has no variants)
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  variants JSONB NULL, -- [{id, label, image_url, price, quantity}]; quantity 0 = sold out
  likes_count INTEGER NOT NULL DEFAULT 0, -- popular = ORDER BY likes_count DESC
  rating_sum INTEGER NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0, -- avg = rating_sum / rating_count
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_products' AND policyname='Auth insert') THEN
    CREATE POLICY "Auth insert" ON public."23_products" FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='23_products' AND policyname='Owner update') THEN
    CREATE POLICY "Owner update" ON public."23_products" FOR UPDATE USING (owner_id = auth.uid());
  END IF;
END $$;

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

```sql
-- =================================== 🗄️ DB BACKUP FUNCTION ===================================
-- Returns a JSON snapshot of every 23_-prefixed table (one key per table).
-- Called from the export route via supabaseAdmin.rpc('backup_23_tables').
-- SECURITY DEFINER so it can read past RLS; the API route already enforces ADMIN before calling.

CREATE OR REPLACE FUNCTION public.backup_23_tables()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    '23_users',      (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_users" t),
    '23_users_cart', (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_users_cart" t),
    '23_products',   (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_products" t),
    '23_tickets',    (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_tickets" t),
    '23_messages',   (SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM public."23_messages" t)
  );
$$;

-- Lock it down: only the service role (used by supabaseAdmin) may execute it.
REVOKE ALL ON FUNCTION public.backup_23_tables() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.backup_23_tables() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backup_23_tables() TO service_role;
```

> Import is done in JS (the import route upserts each table with `supabaseAdmin` in FK-safe order:
> `23_users → 23_users_cart → 23_products → 23_tickets → 23_messages`), so no SQL function is
> needed for restore.

```sql
-- =================================== ❤️ PRODUCT LIKES / ⭐ RATINGS ===================================
-- Atomic counter bumps so concurrent likes/ratings don't lose updates. Per-user dedup is client-side
-- (localStorage), so these just move the counters. Anyone may call them (likes/ratings are public).

-- like (delta = +1) / unlike (delta = -1); likes_count never goes below 0
CREATE OR REPLACE FUNCTION public.increment_product_likes(p_id VARCHAR, delta INTEGER)
RETURNS INTEGER
LANGUAGE sql
AS $$
  UPDATE public."23_products"
  SET likes_count = GREATEST(0, likes_count + delta)
  WHERE id = p_id
  RETURNING likes_count;
$$;

-- add one rating (stars 1-5): bumps the sum and the count
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
