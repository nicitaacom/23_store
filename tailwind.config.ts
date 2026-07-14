import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{tsx,mdx}", "./storybook/**/*.{tsx,mdx}"],
  theme: {
    fontFamily: {
      primary: ["Inter", "sans-serif"],
      secondary: ["Sora", "sans-serif"],
    },
    // Radius scale is bumped +4px globally (every `rounded*` class softens slightly).
    // `none` and `full` stay fixed. Single source of truth for corner roundness.
    borderRadius: {
      none: "0px",
      sm: "6px",
      DEFAULT: "8px",
      md: "8px",
      lg: "10px",
      xl: "12px",
      "2xl": "14px",
      "3xl": "16px",
      full: "9999px",
    },
    screens: {
      mobile: "415px",
      // => @media (min-width: 415px) { ... }
      tablet: "768px",
      // => @media (min-width: 768px) { ... }
      laptop: "1024px",
      // => @media (min-width: 1024px) { ... }
      desktop: "1440px",
      // => @media (min-width: 1440px) { ... }
    },
    extend: {
      colors: {
        brand: "hsl(var(--brand) / 1)",
        background: "hsl(var(--background) / 1)",
        foreground: "hsl(var(--foreground) / 1)",
        "foreground-accent": "hsl(var(--foreground-accent) / 1)",
        title: "hsl(var(--title) / 1)",
        "title-foreground": "hsl(var(--title-foreground) / 1)",
        subTitle: "hsl(var(--subTitle) / 1)",

        /* The same colors */
        "border-color": "hsl(var(--border-color) / 1)" /*subTitle*/,
        "icon-color": "hsl(var(--icon-color) / 1)" /* title */,

        /* Indigo/violet-tinted surface shared by every modal shell */
        "modal-surface": "hsl(var(--modal-surface) / 1)",

        /* Support colors */
        info: "hsl(var(--info) / 1)",
        danger: "hsl(var(--danger) / 1)",
        warning: "hsl(var(--warning) / 1)",
        success: "hsl(var(--success) / 1)",
        "success-accent": "hsl(var(--success-accent) / 1)",
      },
      boxShadow: {
        compact: "0 10px 28px rgba(0, 0, 0, 0.16)",
        "compact-lg": "0 16px 38px rgba(0, 0, 0, 0.2)",
      },
    },
  },
  plugins: [],
}
export default config
