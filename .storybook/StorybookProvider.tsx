import { useEffect, useLayoutEffect, type ReactNode } from "react";

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

function applyStoryTheme(isDarkMode: boolean, normalizedLocale: string) {
  useDarkModeStore.setState({ isDarkMode });
  document.documentElement.classList.toggle("light", !isDarkMode);
  document.documentElement.classList.toggle("dark", isDarkMode);
  const tokens = isDarkMode
    ? { "--background": "0deg 0% 7%", "--foreground": "0deg 0% 16%", "--title": "0deg 0% 88%", "--subTitle": "0deg 0% 63%" }
    : { "--background": "0deg 0% 93%", "--foreground": "0deg 0% 84%", "--title": "0deg 0% 12%", "--subTitle": "0deg 0% 34%" };
  for (const [name, value] of Object.entries(tokens)) document.documentElement.style.setProperty(name, value);
  document.documentElement.lang = normalizedLocale;
  // A month schedule can switch the site theme after paint. Stories measure the default palette.
  document.documentElement.dataset.theme = "default";
}

export function StorybookProvider({ children, locale, storyId, theme }: IStorybookProviderProps) {
  const isDarkMode = theme === "dark";
  const normalizedLocale = getStorybookLocale(locale);

  useLayoutEffect(() => {
    applyStoryTheme(isDarkMode, normalizedLocale);
  }, [isDarkMode, normalizedLocale, storyId]);

  useEffect(() => {
    applyStoryTheme(isDarkMode, normalizedLocale);
  }, [isDarkMode, normalizedLocale, storyId]);

  return (
    <I18nProviderClient locale={normalizedLocale}>
      <div className={`${isDarkMode ? "dark " : ""}min-h-screen bg-background text-title`}>{children}</div>
    </I18nProviderClient>
  );
}
