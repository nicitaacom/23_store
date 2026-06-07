# UI Style

UI in this project should be minimalistic, compact, and content-first.

- Keep layouts dense. Prefer small gaps, small paddings, and tight grouping so more content fits on screen without large empty margins.
- Default spacing should stay close to `2px`, `4px`, `6px`, and `8px`. Treat larger spacing as an exception.
- Default border radius should stay around `4px`. Use slightly larger radii only for bigger panels or media frames.
- Avoid `rounded-full` unless the shape must be circular, like an avatar, status dot, or truly round icon button.
- Reuse shared primitives for buttons, inputs, panels, badges, overlays, and modal shells instead of hard-coding one-off classes.
- Prefer token colors like `background`, `foreground`, `title`, `subTitle`, `border-color`, `brand`, `success`, `warning`, `danger`, and `info`.
- Shadows should be subtle. Depth should mostly come from borders, contrast, and layered surfaces, not oversized blur.
- Empty states, cards, dropdowns, and modals should feel like the same system: compact, readable, and low-noise.
