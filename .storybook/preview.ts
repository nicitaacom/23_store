import "../app/globals.css";

import type { Preview } from "@storybook/nextjs-vite";

const preview: Preview = {
  initialGlobals: {
    locale: "en",
    theme: "light",
  },
  globalTypes: {
    locale: {
      description: "Locale used by the story",
      toolbar: {
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "fi", title: "Suomi" },
          { value: "ru", title: "Русский" },
          { value: "se", title: "Svenska" },
        ],
      },
    },
    theme: {
      description: "Color theme used by the story",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
      },
    },
  },
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    options: {
      storySort: {
        order: [
          "Foundations",
          "UI",
          "Commerce",
          "Navigation",
          "Authentication",
          "Support",
          "Admin",
        ],
      },
    },
    viewport: {
      options: {
        mobileSmall: { name: "Mobile 320", styles: { width: "320px", height: "900px" } },
        mobileLarge: { name: "Mobile 414", styles: { width: "414px", height: "900px" } },
        tablet: { name: "Tablet 768", styles: { width: "768px", height: "1024px" } },
        laptop: { name: "Laptop 1024", styles: { width: "1024px", height: "900px" } },
        desktop: { name: "Desktop 1440", styles: { width: "1440px", height: "1080px" } },
        desktopWide: { name: "Desktop 1920", styles: { width: "1920px", height: "1080px" } },
      },
    },
  },
  tags: ["autodocs"],
};

export default preview;
