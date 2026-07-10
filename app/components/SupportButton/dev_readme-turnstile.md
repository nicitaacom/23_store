## Info about SupportButton.tsx

This button that you always see in bottom right corner
Logic for this button:

1. user or !user send message to support on site using SupportButton.tsx
2. After first message I send telegram message with telegram bot API to support (myself) like 'somebody need help'
   To check is this first message I create
3. user and !user may have only 1 open ticket to create new ticket
   this current ticket must be closed with vote 1/5 and feedback optional

# Trunstile implementation

## Cloudflare dashboard setup

Widget config lives at Cloudflare dashboard → Turnstile → your widget → Edit Widget.

Hostname Management — every hostname the widget is allowed to run on must be listed here, otherwise `siteverify` rejects the token:

![hostname](/public/docs/turnstile/hostname.png)

Widget Keys — Site key maps to `NEXT_PUBLIC_CLOUDFLARE_SITE_KEY`, Secret key maps to `TURNSTILE_SECRET_KEY`:

![widget-keys](/public/docs/turnstile/widget-keys.png)

### Step 1

In layout.tsx

```tsx
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

### Step 2

Env in .env.local
And update env.d.ts

### Step 3

```tsx
const turnstileRef = useRef<HTMLDivElement>(null)

  const { isVerified } = useVerifyHuman(turnstileRef)


return (

 {process.env.NODE_ENV === "production" && !isVerified && (
          <div ref={turnstileRef} className="absolute cf-turnstile"></div>
        )}
)
```

### Step 4

Somewhere in hooks folder

app/hooks/useVerifyHuman.ts

```tsx
import { RefObject, useEffect, useState } from "react"

export const useVerifyHuman = (turnstileRef: RefObject<HTMLDivElement>) => {
  const [isVerified, setIsVerified] = useState(false) // State for verification status

  useEffect(() => {
    if (turnstileRef.current) {
      // @ts-ignore
      window.turnstile.render(turnstileRef.current, {
        sitekey: process.env.NEXT_PUBLIC_CLOUDFLARE_SITE_KEY,
        callback: (token: string) => {
          setIsVerified(true) // Set verification status to true
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { isVerified }
}
```
