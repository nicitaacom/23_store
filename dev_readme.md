## What in this docs?

- How to find docs "how to implement/use something or how something work"
- Tasks (TODO) for this project
- Problem that this site solve
- Site
- How to add docs

<br/>

<details><summary><b>👁️ How does it looks like?</b></summary>

Problem that this site solve

<b>Problem: </b>Buy and sell something but we have amazon but it has bad UI and prices can be lower<br/>
<b>Solution: </b>Create this site that better other ones where everybody can buy or sell something with low prices and better variety of products<br/>
Site created with focus on performance for better SEO<br/>
Obviously it's no ads for this so not everyone even will know about this project

</details>

<br/>

<details> <summary><b>Terminology so you understand it better</b></summary>

set - set in state (not DB)<br/>
get - get from state (not DB)<br/>
upd - update state (not DB)<br/>
create - form to add smth (not DB and/or DB)<br/>
add - add configured new state to arr e.g to labelsArr configured label+hex (not DB and/or DB)<br/>
addEmpty - a initial state to array e.g to VPSConfigs initial VPS config with no data
push - push smth in arr in state only for this arr e.g email labels (not DB and/or DB)<br/>
remove - filter smth from arr state (not DB and/or DB)<br/>
increase - add number to number state (not DB and/or DB)<br/>
decrease - remove number from number state (not DB and/or DB)<br/>
toggle - toggle boolean state (not DB and/or DB)<br/>

extract - extract smth from smth e.g scheduledTimeISO from idName<br/>
group - return group from smth<br/>

selectDB - select smth from Supbase<br/>
insertDB - insert smth in Supbase<br/>
updateDB - update smth in Supabase<br/>
deleteDB - delete smth in Supabase<br/>

getRedis - get something from Redis<br/>
setRedis - set something in Redis<br/>
updRedis - update something in Redis<br/>
delRedis - delete something from Redis<br/>

</details>

<details> <summary><b>Code principles</b></summary>

DRY SOLID KISS

and 1 source of truth
and follow docs strucutre

</details>

### Docs

<details> <summary><b>If you want implement something (find docs)</b></summary>

You may find it in related to waht you want to implement folder<br/>
For example you want implement some new modal - ctrl+p - `modals/dev_reamde.md` <br/>

</details>

<details> <summary><b>If you want use something (find docs)</b></summary>

For example:
Stats: `app/[locale]/(site)/stats/dev_readme-utm.md`
Same principle applies for another feature or widget
you just write `dev_readme.md` in **same** folder.

</details>

<details> <summary><b>If you want understand how something work (find docs)</b></summary>

> The best way to understand how something works is to "see" it
> Refer to docs structure in `CLAUDE.md`

If you want to understand how something work its better to open official docs or do some project (in case its some library)<br/>
If you want to undestand some code usually you may find necessary comments that explains you how some part of code work<br/>
because you know you may do X in A or B or C way

</details>

<details> <summary><b>Usage for colours :root</b></summary>

<b>Don't rename existing color names! sOlid (open for expansion closed for modificaion)</b><br/>

<b>Edit/add colour:</b> Edit color in `index.css` or add color in `index.css` and `tailwind.config.ts`<br/>

</details>

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

</details>

<hr/>

<br/>

<br/>

<br/>

<br/>

## Tasks (TODO) - Create TODO - Contribute

<b>Github projects:</b> https://github.com/users/nicitaacom/projects/5<br/>
<b>Create TODO:</b> use the same structure as in another tasks<br/>
<b>Contribute: </b> check `CONTRIBUTING.md`

<hr/>

<br/>

<br/>

<br/>

<br/>

<br/>

[dev_readme-supbase-sql](./dev_readme-supbase-sql.md)

<hr/>

<br/>

<details> <summary><b>⚠️🖼️ Vercel Image Optimization quota (402 on every image)</b></summary>

Free tier caps `Image Optimization - Transformations` at 5K/month.<br/>
Once exceeded, `/_next/image` returns `402` (`x-vercel-error: OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`) for **every** image site-wide, not just one broken URL.<br/>
Looks like a broken remote pattern or a missing storage file - it's neither; `next.config.js` and Supabase Storage can both be correct and this still fires.

**Check:** Vercel dashboard → project → Usage → `Image Optimization - Transformations` row.<br/>
**Fix:** wait for the monthly reset, upgrade the plan, or set `images.unoptimized: true` (globally or per `<Image>`) to skip Vercel's optimizer and serve straight from Supabase's own CDN.

</details>
