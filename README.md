# What inside? <br/> <sub> https://23-store.vercel.app/</sub>

[![23-store-overview](https://i.imgur.com/F9FiGHK.jpg)](https://streamable.com/1zdhl7)

## Project info

### Performance - 35 mobile / 73 desktop (01.03.2024)

### Performance - 60 mobile / ? desktop (10.03.2024)

### Performance - 74 mobile / 94 desktop (24.03.2024)

![perf](https://i.imgur.com/B6EA55v.png)

### Stack - Next + TypeScript + Tailwind + supabase + zustand + stripe

<br/>
<br/>
<br/>

# Clone repository

## Step 1.1 - clone repository (variant 1)

![alt text](https://i.imgur.com/9KSgjaN.png)

## or Step 1.1 - clone repository (variant 2)

```
git clone https://github.com/nicitaacom/23_store
cd 23_store
```

## Step 1.2 - install deps

```
pnpm i
```

<br/>
<br/>
<br/>

## Step 2 - setup .env (variant 1 - dockerized)

### Step 2.1 Prerequirements - install docker

Commands (also available with video guide on YouTube - https://www.youtube.com/watch?v=O2D6rPJI2oM)

```bash
sudo apt update
sudo apt intall -y docker.io
sudo systemctl enable docker --now
sudo usermod -aG docker $USER
sudo reboot
```

### Step 2.2 - build docker image and run docker container

```bash
docker build -t 23_store .
docker run -dp 3000:3000 23_store
```

To stop docker use - `docker stop <container_id_or_name>`

## Step 2 - setup .env (variant 2 - manually)

### 2.1 - google cloud console

[![setup_google_video](https://i.imgur.com/s8F1YYA.png)](https://streamable.com/blib2f)

### 2.2 - supabase

Login in supabase - https://app.supabase.com/sign-in
![Login in supabase](https://i.imgur.com/zxJFahy.png)

### 2.3 - supabase

![Click new project](https://i.imgur.com/9YZGJ8j.png)

### 2.4 - supabase

![Enter aer](https://i.imgur.com/zxJFahy.png)

### 2.5 - supabase

![Set up supabase project](https://i.imgur.com/0xIb866.png)

### 2.6 - supabase

![Copy .env](https://i.imgur.com/Rh6rHtg.png)

### 2.7 - supabase

![Paste .env](https://i.imgur.com/KI7jpAR.png)

### 2.8 - supabase setup

<details>
<summary>1. messages</summary>

```sql
create table
  public.messages (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    ticket_id text not null,
    sender_id text not null,
    sender_username text not null,
    body text not null,
    images text[] null,
    seen boolean not null default false,
    sender_avatar_url text null,
    constraint messages_pkey primary key (id),
    constraint messages_ticket_id_fkey foreign key (ticket_id) references tickets (id)
  ) tablespace pg_default;
```

Allow select for SUPPORT and ADMIN roles

```sql
((( SELECT users.role
   FROM users
  WHERE (users.id = auth.uid())) = 'SUPPORT'::text) OR (( SELECT users.role
   FROM users
  WHERE (users.id = auth.uid())) = 'ADMIN'::text))
```

</details>

<details>
<summary>2. products</summary>

```sql
create table
  public.products (
    price_id character varying not null,
    title character varying not null,
    sub_title character varying not null,
    price numeric not null,
    img_url character varying[] not null,
    on_stock integer not null,
    owner_id uuid not null,
    id character varying not null,
    constraint products_pkey primary key (price_id, owner_id, id),
    constraint products_owner_id_fkey foreign key (owner_id) references auth.users (id) on update cascade on delete cascade
  ) tablespace pg_default;
```

**Allow delete for owner_id**

```sql
(owner_id = auth.uid())
```

**insert for authenticated users**

Target roles - authenticated

```sql
true
```

**select for all users**

```sql
true
```

**update for product owners**

```sql
(owner_id = auth.uid())
```

</details>

<details>
<summary>3. tickets</summary>

```sql
create table
  public.tickets (
    created_at timestamp with time zone not null default now(),
    is_open boolean not null default true,
    owner_username text not null,
    owner_id text not null,
    id text not null,
    last_message_body text not null default ''::text,
    owner_avatar_url text null,
    rate integer null,
    constraint tickets_pkey primary key (id)
  ) tablespace pg_default;
```

**allow close ticket for SUPPORT and ADMIN roles**

```sql
((( SELECT users.role
   FROM users
  WHERE (users.id = auth.uid())) = 'SUPPORT'::text) OR (( SELECT users.role
   FROM users
  WHERE (users.id = auth.uid())) = 'ADMIN'::text))
```

**allow select for SUPPORT and ADMIN**

```sql
((( SELECT users.role
   FROM users
  WHERE (users.id = auth.uid())) = 'SUPPORT'::text) OR (( SELECT users.role
   FROM users
  WHERE (users.id = auth.uid())) = 'ADMIN'::text))
```

</details>

<details>
<summary>4. users</summary>

```sql
create table
  public.users (
    id uuid not null,
    created_at timestamp with time zone not null default now(),
    username text not null,
    email text not null,
    avatar_url text null,
    role text not null default 'USER'::text,
    email_confirmed_at timestamp with time zone null,
    providers text[] null default '{}'::text[],
    constraint users_pkey primary key (id),
    constraint users_id_fkey foreign key (id) references auth.users (id) on update cascade on delete cascade
  ) tablespace pg_default;
```

**allow select for users based on their ids**

```sql
(id = auth.uid())
```

</details>

<details>
<summary>5. users_cart</summary>

```sql
create table
  public.users_cart (
    id uuid not null,
    created_at timestamp with time zone not null default now(),
    cart_products jsonb not null default '{}'::jsonb,
    constraint users_cart1_pkey primary key (id),
    constraint users_cart_id_fkey foreign key (id) references auth.users (id) on update cascade on delete cascade
  ) tablespace pg_default;
```

**allow select based on their id**

```sql
(id = auth.uid())
```

**allow user to update their carts**

```sql
(id = auth.uid())
```

</details>

<details>
<summary>Authentication - Providers</summary>

Email - enabled

- Confirm email - ON
- Secure email change - ON
- Secure password change - OFF
- Mailer OTP Expiration - 86400
- Min password length - 6

Google - enabled

- Client ID (for OAuth) - `paste from .env`
- Client Secret (for OAuth) - `paste from .env`

Twitter - enabled

API key - `paste from .env`
API Secret Key - `paste from .env`

</details>

<details>
<summary>Authentication - Email templates</summary>

Adjust another emails for `Invite user` `Magic link` `Change email address` `Reset password` if needed

Confirm signup

```html
<table style="max-width: 640px; width: 100%;background-color:rgb(32,32,32)" align="center">
  <td style="min-width:100%;margin:0rem;padding:1rem 0rem;text-align:center"></td>

  <tr>
    <td style="text-align:center">
      <img src="https://i.imgur.com/KmMEBux.png" alt="" style="width: 40%;" />
    </td>
  </tr>
  <tr>
    <td style="font-weight: bold; text-align:center;font-size: 18px; color: #666666; padding: 10px 0;">
      Verify your email on 23_store
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
            href="{{ .SiteURL }}/support"
            style="color:rgb(64,125,237);text-decoration:none;margin:0px;font-size:0.875rem;line-height:1.25rem;text-align:center;margin-right:1rem"
            target="_blank"
            data-saferedirecturl="https://www.google.com/url?q={{ .SiteURL }}/support&amp;source=gmail&amp;ust=1696683582414000&amp;usg=AOvVaw1cLGx1tiGtSp3MUWJAOiih"
            >Support</a
          >
          <a
            href="{{ .SiteURL }}/feedback"
            style="color:rgb(64,125,237);text-decoration:none;margin:0px;font-size:0.875rem;line-height:1.25rem;text-align:center;margin-right:1rem"
            target="_blank"
            data-saferedirecturl="https://www.google.com/url?q={{ .SiteURL }}/feedback&amp;source=gmail&amp;ust=1696683582414000&amp;usg=AOvVaw2J2syDW1hX-6J6kkisMOBZ"
            >Feedback</a
          >
        </td>
      </tr>
    </tbody>
  </table>
</table>
```

</details>

<details>
<summary>Authentication - URL Configuration</summary>

Site URL - https://23-store.vercel.app<br/>

Redirect URLs: (note that its better to don't use \*\* - use path without \*\* instead)

```md
http://localhost:3023/\*\* (I hate prettier)

https://23-store.vercel.app/auth/callback/credentials

https://23-store.vercel.app/?modal=AuthModal&variant=resetPassword&code=**

https://23-store.vercel.app/error?error_description=**

https://23-store.vercel.app/auth/completed?code=**

https://23-store.vercel.app/**

https://23-store.vercel.app/auth/callback/oauth?provider=**
```

</details>

<details>

<summary>Storage</summary>

1. Create new bucked called 'public' and make 'public bucket' - ON

2. Create RLS policy for that bucket

Allow select and instert for all users

```sql
(bucket_id = 'public'::text)
```

I noticed only here that only authenticated users may instert
so you may adjust this RLS policy if you want

</details>

### 2.9 - stripe - login/register

stripe - https://app.supabase.com/sign-in

![login/register in stripe](https://i.imgur.com/D7OZC93.png)

### 2.10 - stripe

![copy .env](https://i.imgur.com/1BgzWI2.png)

### 2.11 - stripe

![paste .env](https://i.imgur.com/LPiFK31.png)

### 2.12 - resend - login/register

![login/register in resend.com](https://i.imgur.com/reEKSuH.png)

### 2.13 - resend - buy your domain

![buy and add domain in resend](https://i.imgur.com/DAAQgbN.png)

### 2.14 - resend

![copy .env](https://i.imgur.com/gFqtYtU.png)

### 2.15 - resend

Alternativaly if you have problems on this step you may check guide on YouTube
`how to setup resend` or `how to send email using react`

### 2.16 - your email you send emails from

`NEXT_PUBLIC_SUPPORT_EMAIL='your_email_where_you_send_messages_from'`

It may be your email based on your domain like youremail@yourdomain.smth

### 2.17 - paypal

1. Google - paypal developer - login/register
2. Use this guide - https://developer.paypal.com/api/rest/
   ![copy .env](https://i.imgur.com/8G5BXuq.png)

### 2.18 - paypal

1. Click 'Create App' - in case you haven't one
2. Click on your app name in my case 'Platform Partner App - 5321855133911008505'
   ![copy .env](https://i.imgur.com/ojdT3vb.png)

### 2.19 - paypal

![copy .env](https://i.imgur.com/BLvt8O1.png)

### 2.20 - paypal

![copy .env](https://i.imgur.com/3b0Shg7.png)

### 2.21 - metamask

1. I suppose that you advanced PC user and able to register/login in metamask
   ![copy metamask address](https://i.imgur.com/l9nTHB6.png)

### 2.22 - metamsk

![paste metamask address](https://i.imgur.com/r5Xai6j.png)

### 2.23 - coinmarketcap

1. login/register in coinmarketcap developer (google - coinmarketcap developer - login - etc)

![copy .env](https://i.imgur.com/w2aTQki.png)

### 2.24 - coinmarketcap

![paste .env](https://i.imgur.com/i5n4wDH.png)

## Step 2.25 - run project

```
pnpm dev
```

<br/>
<br/>
<br/>

# Feedback

If you found some bug/issue - just go ahead and open a new issue
