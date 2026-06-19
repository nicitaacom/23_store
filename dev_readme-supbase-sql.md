## DB tables

### utm_stats table (SHARED)

This project shares the `utm_stats` table with projects: 14_portfolio, 28_notion-clone, and 29_ai-companion.

```sql
-- =================================== 📊 utm_stats table (SHARED across 14, 23, 28, 29) ===================================
-- Unified UTM tracking across all portfolio projects

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

-- ⚠️ SHARED TABLE: Projects 14_portfolio, 23_store, 28_notion-clone, 29_ai-companion use this same utm_stats table
-- All UTM tracking data is aggregated in a single shared Supabase table
```

<summary><b>SQL query for all DB</b></summary>

```sql
-- 👥 Users Table (created first for foreign key dependencies)
CREATE TABLE IF NOT EXISTS public.23_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  email_confirmed_at TIMESTAMPTZ NULL,
  providers TEXT[] NULL DEFAULT '{}'
);

-- 🔐 RLS Policies for Users
ALTER TABLE 23_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Self select" ON 23_users FOR SELECT USING (id = auth.uid());

-- 🎫 Tickets Table
CREATE TABLE IF NOT EXISTS public.23_tickets (
  id TEXT NOT NULL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_open BOOLEAN NOT NULL DEFAULT true,
  owner_username TEXT NOT NULL,
  owner_id text not null,
  last_message_body TEXT NOT NULL DEFAULT '',
  owner_avatar_url TEXT NULL,
  rate INTEGER NULL
);

-- 🔐 RLS Policies for Tickets
ALTER TABLE 23_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SUPPORT/ADMIN all access" ON 23_tickets FOR ALL USING (
  EXISTS (SELECT 1 FROM 23_users WHERE id = auth.uid() AND role IN ('SUPPORT', 'ADMIN'))
);

-- 💬 Messages Table
CREATE TABLE IF NOT EXISTS public.23_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ticket_id TEXT NOT NULL REFERENCES 23_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES 23_users(id) ON UPDATE CASCADE ON DELETE CASCADE,  -- Changed to UUID
  sender_username TEXT NOT NULL,
  body TEXT NOT NULL,
  images TEXT[] NULL,
  seen BOOLEAN NOT NULL DEFAULT false,
  sender_avatar_url TEXT NULL
);

-- 🔐 RLS Policies for Messages
ALTER TABLE 23_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SUPPORT/ADMIN select" ON 23_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM 23_users WHERE id = auth.uid() AND role IN ('SUPPORT', 'ADMIN'))
);

-- 🛒 Products Table
CREATE TABLE IF NOT EXISTS public.23_products (
  price_id VARCHAR NOT NULL,
  id VARCHAR NOT NULL,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  price NUMERIC NOT NULL, -- base price, used when no variant selected
  img_url VARCHAR[] NOT NULL,
  on_stock INTEGER NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  -- variants stored as JSONB array: [{id, label, image_url, price}]
  variants JSONB NULL,
  PRIMARY KEY (price_id, owner_id, id)
);

-- 🔐 RLS Policies for Products
ALTER TABLE 23_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users select" ON 23_products FOR SELECT USING (true);
CREATE POLICY "Owner delete" ON 23_products FOR DELETE USING (owner_id = auth.uid());
CREATE POLICY "Auth insert" ON 23_products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Owner update" ON 23_products FOR UPDATE USING (owner_id = auth.uid());

-- 🛍️ Users Cart Table
CREATE TABLE IF NOT EXISTS public.23_users_cart (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cart_products JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 🔐 RLS Policies for Users Cart
ALTER TABLE 23_users_cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Self select" ON 23_users_cart FOR SELECT USING (id = auth.uid());
CREATE POLICY "Self update" ON 23_users_cart FOR UPDATE USING (id = auth.uid());
-- 📊 UTM Stats Table (tracking marketing campaign performance)
CREATE TABLE IF NOT EXISTS public.utm_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  utm_source VARCHAR NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT utm_stats_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

ALTER TABLE utm_stats ENABLE ROW LEVEL SECURITY;









-- =================================== STORAGE BUCKETS ===================================

-- Create 23_public-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('23_public-images', '23_public-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for 23_public-images bucket
CREATE POLICY "allow_insert_for_everyone_23_public_images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = '23_public-images');

CREATE POLICY "allow_select_for_everyone_23_public_images" ON storage.objects
FOR SELECT USING (bucket_id = '23_public-images');

-- Create 23_avatar-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('23_avatar-images', '23_avatar-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for 23_avatar-images bucket
CREATE POLICY "allow_insert_for_everyone_23_avatar_images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = '23_avatar-images');

CREATE POLICY "allow_select_for_everyone_23_avatar_images" ON storage.objects
FOR SELECT USING (bucket_id = '23_avatar-images');

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
