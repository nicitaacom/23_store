## Usage for DesktopSidebar.tsx

I use this component to display all open tickets in `/support/tickets/123` route
So users with screen 1024px+ see it

## Usage for MessagesBody.tsx

I use this component to display all messages in this ticket id

## Usage for MessagesFooter.tsx

I use this server component to keep performance
With client component where I use react-hook-form it throws error about 'supabaseKey is required'
when I don't use supabaseKey there

## Usage for MessagesHeader.tsx

I use this component to display current user support help to and to delete this ticke

## Usage for MobileSidebar.tsx

I use this component to display all open tickets in `/support/tickets/123` route
So users with screen 1024px- see it

## Usage for TicketsList.tsx

I use this component as in `layout.tsx` (RootLayout) its wrapper for desktop and mobile sidebar
Also in this component I pass children as a prop - so children in this component its a server component by default
