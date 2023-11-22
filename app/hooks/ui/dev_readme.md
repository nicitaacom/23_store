## Usage for useAvatarDropdownClose.ts

For avatar dropdown you see in top right corner (in navbar)
this hook used for:

1. Handling `click outside` dropdown event (if click outside dropdown - close dropdown)
2. Handling `esc` press (if click on 'esc' key - close dropdown)

<br/>

<br/>

## Usage for useContactDropdownClose.ts

For phone icon you see in top right corner (in navbar)
![contact-dropdown](https://i.imgur.com/GLmdzt6.png)

this hook used for:

1. Handling `click outside` dropdown event (if click outside dropdown - close dropdown)
2. Handling `esc` press (if click on 'esc' key - close dropdown)

<br/>

<br/>

## Usage for useDragging

This hook need to make whole screen as drag&drop zone
When you decide to add product you need to upload the image
with this hook you may drag&drop image on whole screen and don't care that you drop outside
'click or drop here' input type=file

issue with this hook is:

1. This hook conflict with `react-images-uploading` library (dependency))
   that's why when you move your coursor back in explorer/Thunar (win/kali) this black screen remains
   Also its how to look at it it may improve UX as well because user may accidentely drop not correct image (image that user don't want)

<br/>

<br/>

## Usage for useSender.ts

I use this to show avatar and don't write long code (7-15 lines of code)<br/>
It should work like this:

![example-how-it-should-work](https://i.imgur.com/qkNRqbI.png)

<br/>

<br/>

## Usage for useSupportDropdownClose.ts

For support button you see in bottom right corner

this hook used for:

1. Handling `click outside` dropdown event (if click outside dropdown - close dropdown)
2. Handling `esc` press (if click on 'esc' key - close dropdown)

<br/>

<br/>
