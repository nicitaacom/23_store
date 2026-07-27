import path from "node:path";
import { fileURLToPath } from "node:url";

import type { StorybookConfig } from "@storybook/nextjs-vite";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  // Stories live in `storybook/` only (see dev_readme-storybook.md) - an `app/**` glob matches
  // nothing and makes every storybook/vitest run print a "No story files found" warning.
  stories: ["../storybook/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-themes",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  async viteFinal(viteConfig) {
    return {
      ...viteConfig,
      resolve: {
        ...viteConfig.resolve,
        alias: {
          "@/actions/selectTicketId": path.resolve(currentDirectory, "../storybook/mocks/selectTicketId.ts"),
          "@/libs/pusher": path.resolve(currentDirectory, "../storybook/mocks/pusher.ts"),
          "@/libs/supabase/supabaseClient": path.resolve(
            currentDirectory,
            "../storybook/mocks/supabaseClient.ts",
          ),
          "@/sdk/SupportSDK/SupportSDK": path.resolve(currentDirectory, "../storybook/mocks/supportSDK.ts"),
          ...viteConfig.resolve?.alias,
          "@": path.resolve(currentDirectory, "../app"),
        },
      },
    };
  },
};

export default config;
