# What in this docs?

- How to find docs "how to implement/use something or how something work"
- Tasks (TODO) for this project
- Problem that this site solve
- Site
- How to add docs

<br/>

# How to find docs

### If you want implement something (find docs)

You may find it in related to waht you want to implement folder<br/>
For example you want implement some new modal - ctrl+p - `modals/dev_reamde.md` <br/>

### If you want to use something (find docs)

For example some function for that read docs in some store.ts file
If you want to reuse some function that not exist in some store.ts file<br/>
its better to understand that its fine that if in different (organization-routes)<br/>
e.g (site) or (auth) may be functions with the same name and logic - its fine because usually this functions a bit different<br/>

### If you want understand how something work (find docs)

If you want to understand how something work its better to open official docs or do some project (in case its some library)<br/>
If you want to undestand some code usually you may find necessary comments that explains you how some part of code work<br/>
because you know you may do X in A or B or C way

<br/>

# Tasks (TODO) for this project

You may find it - https://github.com/users/nicitaacom/projects/5/views/1?sortedBy%5Bdirection%5D=desc&sortedBy%5BcolumnId%5D=59471618&pane=issue&itemId=43896841<br/>
If you want to create some TODO - use the same structure as in another tasks
If you want contribute to this project - check `CONTRIBUTING.md`

<br/>

# Problem that this site solve

<b>Problem:</b><br/>
Buy and sell something<br/>
<b>Solution:</b><br/>
Create this site that better other ones where everybody can buy or sell something<br/>
Site created with focus on performance for better SEO

<br/>
<br/>

## Usage for colors :root

`Don't rename color names`<br/>

You may edit color in index.css or add color in index.css and tailwind.config.ts<br/>

If you edit color - change HSL L - lightness for dark mode

label-foreground - for contrast on background (e.g red-white AAA - green-white A)

brand - cta / active / main color / cta icon/text hover<br/>
backgound - background only<br/>
foreground - card / modal etc<br/>

title - text-title / icon / border-color (if component looks as icon)<br/>
title-foreground - for match contrast with brand<br/>
subTitle - text-subTitle / border-color (button/input-outline)<br/>
info - info button - link - any info or cta info<br/>

hover - brightness-75<br/>
color - if the same with something else
\*/

<br/>
<br/>

## Usage for folder stucture

```
To keep it simple and maintainable I use next folder structure:
```

### Basic rules (applies to every rule below)

Every folder should have index.ts<br/>
Every folder should have related to functionality name</br>
Every file should have related to functionality folder

<br/>

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

# DB tables

### Messages

allow select for SUPPORT and ADMIN roles

```sql
((( SELECT users.role
   FROM users
  WHERE (users.id = auth.uid())) = 'SUPPORT'::text) OR (( SELECT users.role
   FROM users
  WHERE (users.id = auth.uid())) = 'ADMIN'::text))
```

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

### Products

select for all users

```sql
true
```

delete only for owner_id

```sql
(owner_id = auth.uid())
```

insert for authenticated users

targer toles - authenticated

```sql
true
```

update for product owners

```sql
(owner_id = auth.uid())
```

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

### Tickets

allow close ticket for SUPPORT and ADMIN roles

```sql
((( SELECT users.role
   FROM users
  WHERE (users.id = auth.uid())) = 'SUPPORT'::text) OR (( SELECT users.role
   FROM users
  WHERE (users.id = auth.uid())) = 'ADMIN'::text))
```

allow select for for SUPPORT and ADMIN

```sql
((( SELECT users.role
   FROM users
  WHERE (users.id = auth.uid())) = 'SUPPORT'::text) OR (( SELECT users.role
   FROM users
  WHERE (users.id = auth.uid())) = 'ADMIN'::text))
```

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

### Users

allow select for users based on their ids

```sql
(id = auth.uid())
```

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

### users_cart

allow select based on their id

```sql
allow select based on their id
```

allow user to update their carts

```sql
(id = auth.uid())
```

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

### Public bucket

select and insert for all users

```sql
(bucket_id = 'public'::text)
```

## Email templates

### Verify your email

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
            href="http://localhost:8000/support"
            style="color:rgb(64,125,237);text-decoration:none;margin:0px;font-size:0.875rem;line-height:1.25rem;text-align:center;margin-right:1rem"
            target="_blank"
            data-saferedirecturl="https://www.google.com/url?q=http://localhost:8000/support&amp;source=gmail&amp;ust=1696683582414000&amp;usg=AOvVaw1cLGx1tiGtSp3MUWJAOiih"
            >Support</a
          >
          <a
            href="http://localhost:8000/feedback"
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

For other templates the same - jsut change text `Verify your email on 23_store` and `Verify email`

### URL configuration

Site url - https://23-store.vercel.app

http://localhost:3023/\*\*

https://23-store.vercel.app/auth/callback/credentials

https://23-store.vercel.app/?modal=AuthModal&variant=resetPassword&code=**

https://23-store.vercel.app/error?error_description=**

https://23-store.vercel.app/auth/completed?code=**

https://23-store.vercel.app/**

https://23-store.vercel.app/auth/callback/oauth?provider=**
