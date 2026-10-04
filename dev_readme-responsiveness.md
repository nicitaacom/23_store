# Mobile responsiveness

- Remove page and container padding on phones; use small inner padding only where content needs breathing room.
- Keep gaps and margins tight while preserving readable text and 44px touch targets.
- Make mobile modals fullscreen, edge-to-edge, borderless, and scrollable, with a reachable close control.
- Prevent horizontal overflow with wrapping and `min-w-0`; keep short-screen actions reachable.
- Prefer CSS `dvh` for viewport-sized layouts. Use `useScreenHeight` when JavaScript must react to the visible height, such as collapsing an accordion on a short screen.
