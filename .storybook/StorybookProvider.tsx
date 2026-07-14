import { useLayoutEffect, type ReactNode } from "react";

import { resetStorybookStores } from "../storybook/store/resetStorybookStores";
import useDarkModeStore from "@/store/ui/useDarkModeStore";
import { I18nProviderClient } from "@/locales/client";

const supportedLocales = ["en", "fi", "ru", "se"] as const;
type TStorybookLocale = (typeof supportedLocales)[number];

interface IStorybookProviderProps {
  children: ReactNode;
  locale: unknown;
  storyId: string;
  theme: unknown;
}

function getStorybookLocale(locale: unknown): TStorybookLocale {
  return supportedLocales.includes(locale as TStorybookLocale) ? (locale as TStorybookLocale) : "en";
}

export function StorybookProvider({ children, locale, storyId, theme }: IStorybookProviderProps) {
  const isDarkMode = theme === "dark";
  const normalizedLocale = getStorybookLocale(locale);

  useLayoutEffect(() => {
    resetStorybookStores();
    useDarkModeStore.setState({ isDarkMode });
    document.documentElement.classList.toggle("dark", isDarkMode);
    document.documentElement.lang = normalizedLocale;
  }, [isDarkMode, normalizedLocale, storyId]);

  return (
    <I18nProviderClient locale={normalizedLocale}>
      <div className="min-h-screen bg-light text-dark dark:bg-dark dark:text-light">{children}</div>
    </I18nProviderClient>
  );
}
