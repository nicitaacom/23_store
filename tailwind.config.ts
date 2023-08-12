import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
     fontFamily: {
      primary: ["Inter", "sans-serif"],
      secondary: ["Proxima Nova", "sans-serif"]
    },
     screens: {
      tablet: "768px",
      // => @media (min-width: 768px) { ... }
      laptop: "1024px"
      // => @media (min-width: 1024px) { ... }
    },
    extend: {
      colors: {
        primary: "#202020",
        "primary-dark": "#303030",
        secondary: "#6B7280", //bg-gray-500
        "secondary-dark": "#4c515c",
        cta: "rgba(254, 14, 0)",
        "danger": "rgba(197, 52, 52, 1)",
        "success": "rgba(58, 184, 63, 1)",
        
      }
    },
  },
  plugins: [],
} satisfies Config;
