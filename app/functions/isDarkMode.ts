import { getCookie } from "@/utils/helpersCSR"

export function isDarkMode() {
  const isDarkMode = getCookie("darkMode") === "dark"
  return isDarkMode
}
