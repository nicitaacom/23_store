# Mobile responsiveness

- Use no page or container padding on phones; add only the minimum needed inside content.
- Keep gaps and margins very small while preserving readable text and 44px touch targets.
- Make modals fullscreen, edge-to-edge, borderless, and scrollable, with a visible, reachable close button.
- Prevent horizontal overflow with wrapping and `min-w-0`; keep actions reachable on short screens.
- Prefer CSS `dvh` for viewport sizing. Use `useScreenHeight` when JavaScript must react to the visible height.
