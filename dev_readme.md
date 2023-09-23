# Problem

# Solution

# Usage



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
*/

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