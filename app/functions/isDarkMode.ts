import { getCookie, setCookie } from "@/utils/helpersCSR"

export function isDarkMode(): boolean {
  if (!getCookie("darkMode")) {
    setCookie("darkMode", "dark")
    return true
  }
  const isDarkMode = getCookie("darkMode") === "dark"
  return isDarkMode
}
