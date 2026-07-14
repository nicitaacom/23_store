import path from "node:path";
import { fileURLToPath } from "node:url";

import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { defineConfig } from "vitest/config";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  optimizeDeps: {
    include: [
      "@react-email/body",
      "@react-email/container",
      "@react-email/head",
      "@react-email/heading",
      "@react-email/hr",
      "@react-email/html",
      "@react-email/img",
      "@react-email/render",
      "@react-email/section",
      "@react-email/text",
      "framer-motion",
      "react-icons/ai",
      "react-icons/bi",
      "react-icons/fi",
      "react-icons/fa",
      "react-icons/hi",
      "react-icons/io",
      "react-icons/io5",
      "react-icons/lu",
      "react-icons/tb",
      "react-images-uploading",
      "react-loading-skeleton",
      "react-responsive-carousel",
      "react-swipeable",
    ],
  },
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(currentDirectory, ".storybook"),
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
