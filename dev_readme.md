## What in this docs?

- How to find docs "how to implement/use something or how something work"
- Tasks (TODO) for this project
- Problem that this site solve
- Site
- How to add docs

<br/>

## Docs

<details> <summary><b>If you want implement something (find docs)</b></summary>

You may find it in related to waht you want to implement folder<br/>
For example you want implement some new modal - ctrl+p - `modals/dev_reamde.md` <br/>

</details>

<details> <summary><b>AI instructions</b></summary>

1. Image from `next/image`

</details>

<br/>

<details> <summary><b>If you want use something (find docs)</b></summary>

For example some function for that read docs in some store.ts file
If you want to reuse some function that not exist in some store.ts file<br/>
its better to understand that its fine that if in different (organization-routes)<br/>
e.g (site) or (auth) may be functions with the same name and logic - its fine because usually this functions a bit different<br/>

</details>

<details> <summary><b>If you want understand how something work (find docs)</b></summary>

If you want to understand how something work its better to open official docs or do some project (in case its some library)<br/>
If you want to undestand some code usually you may find necessary comments that explains you how some part of code work<br/>
because you know you may do X in A or B or C way

</details>

<hr/>

<br/>

<br/>

<br/>

<br/>

## Tasks (TODO) - Create TODO - Contribute

<b>Github projects:</b> https://github.com/users/nicitaacom/projects/5/views<br/>
<b>Create TODO:</b> use the same structure as in another tasks<br/>
<b>Contribute: </b> check `CONTRIBUTING.md`

<hr/>

<br/>

<br/>

<br/>

<br/>

## Problem that this site solve

<b>Problem:</b>Buy and sell something<br/>
<b>Solution:</b> Create this site that better other ones where everybody can buy or sell something<br/>
Site created with focus on performance for better SEO<br/>
Obviously it's no ads for this so not everyone even will know about this project

<hr/>

<br/>

<br/>

<br/>

<br/>

## Usage for colours :root

<b>Don't rename existing color names!</b><br/>

<b>Edit/add colour:</b> Edit color in `index.css` or add color in `index.css` and `tailwind.config.ts`<br/>

<details> <summary><b>Explanation of colours usage</b></summary>

--brand - cta / active / main color / cta icon/text hover<br/>
--backgound - background only<br/>
--foreground - card / modal etc<br/>
--title - text-title / icon / border-color (if component looks as icon)<br/>
--title-foreground - for match contrast with brand<br/>
--subTitle - text-subTitle / border-color (button/input-outline)<br/>
--info - info button - link - any info or cta info<br/>

hover - brightness-75<br/>

</details>

<hr/>

<br/>

<br/>

<br/>

<br/>

## Usage and rules for folder stucture

### Rules (applies to every rule below)

Every folder should have index.ts<br/>
Every folder should have related to functionality name</br>
Every file should have related to functionality folder

<br/>

<details> <summary><b>Example of some folders</b></summary>

### components

**src/components/**<br/>
`root components` - something that appears on every page

**src/components/ui/**<br/>
`reusable UI components` <br/>
If the same component have different variation put it into folder

**src/components/pages/page/componentRelatedToPage.tsx**<br/>
`page related components`<br/>
something that appears only in 1 page and looks massy (more than ~50 lines)

**index.ts**<br/>
`each folder should have index.ts`

<br/>

### hooks

**src/hooks/**</br>
`Basic rules`

<br/>

### store

Every store which have `persist` method from zustand should have key
word 'Store' at the end<br/>
Every store that have similar to hook functionality should have key word
'use' at the beggining only in filename<br/>

<br/>

### utils

I haven't a lot of utils now so right now there is no folder structure for that - in case it grow applies the same folder structure as above

</details>

<hr/>

<br/>

<br/>

<br/>

<br/>

## DB tables

<details> <summary><b>SQL query for all DB</b></summary>

```sql
-- 👥 Users Table (created first for foreign key dependencies)
CREATE TABLE IF NOT EXISTS public.users (
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
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Self select" ON users FOR SELECT USING (id = auth.uid());

-- 🎫 Tickets Table
CREATE TABLE IF NOT EXISTS public.tickets (
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
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SUPPORT/ADMIN all access" ON tickets FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('SUPPORT', 'ADMIN'))
);

-- 💬 Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON UPDATE CASCADE ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,  -- Changed to UUID
  sender_username TEXT NOT NULL,
  body TEXT NOT NULL,
  images TEXT[] NULL,
  seen BOOLEAN NOT NULL DEFAULT false,
  sender_avatar_url TEXT NULL
);

-- 🔐 RLS Policies for Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SUPPORT/ADMIN select" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('SUPPORT', 'ADMIN'))
);

-- 🛒 Products Table
CREATE TABLE IF NOT EXISTS public.products (
  price_id VARCHAR NOT NULL,
  id VARCHAR NOT NULL,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  price NUMERIC NOT NULL,
  img_url VARCHAR[] NOT NULL,
  on_stock INTEGER NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  variants jsonb null,
  PRIMARY KEY (price_id, owner_id, id)
);

-- 🔐 RLS Policies for Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users select" ON products FOR SELECT USING (true);
CREATE POLICY "Owner delete" ON products FOR DELETE USING (owner_id = auth.uid());
CREATE POLICY "Auth insert" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Owner update" ON products FOR UPDATE USING (owner_id = auth.uid());

-- 🛍️ Users Cart Table
CREATE TABLE IF NOT EXISTS public.users_cart (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cart_products JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 🔐 RLS Policies for Users Cart
ALTER TABLE users_cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Self select" ON users_cart FOR SELECT USING (id = auth.uid());
CREATE POLICY "Self update" ON users_cart FOR UPDATE USING (id = auth.uid());

-- 📊 UTM Stats Table (tracking marketing campaign performance)
CREATE TABLE IF NOT EXISTS public.utm_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  utm_source VARCHAR NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT utm_stats_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

ALTER TABLE utm_stats ENABLE ROW LEVEL SECURITY;

-- 📦 Public Bucket Policy (Fixed syntax error)
CREATE POLICY "Public access for select" ON storage.objects FOR SELECT USING (bucket_id = 'public');
CREATE POLICY "Public access for insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'public');
```

</details>

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

For other templates the same - jsut change text `Verify your email on joki` and `Verify email`

<br/>

### Providers

`Google` `Twitter`

### Buckets

<details> <summary><b>public-images</b></summary>

`public-images` (public)

<b>Storage policies</b><br/>
allow insert for everyone<br/>
allow select for everyone<br/>

</details>

<b>Other policies under storage.objects</b><br/>
Public access for insert<br/>
Public access for select<br/>

<br/>

<details> <summary><b>URL configuration</b></summary>

```

Site url - https://23-store.vercel.app

http://localhost:3023/\*\*

https://23-store.vercel.app/auth/callback/credentials

https://23-store.vercel.app/?modal=AuthModal&variant=resetPassword&code=**

https://23-store.vercel.app/error?error_description=**

https://23-store.vercel.app/**

https://23-store.vercel.app/auth/callback/oauth?provider=**

```

</details>
