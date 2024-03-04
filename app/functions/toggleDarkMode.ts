// import from CSR because onClick work in client components (you toggle darkMode onClick)
import { getCookie, setCookie } from "@/utils/helpersCSR"

export function toggleDarkMode() {
  if (!getCookie("darkMode")) setCookie("darkMode", "dark")
  else getCookie("darkMode") === "dark" ? setCookie("darkMode", "light") : setCookie("darkMode", "dark")
}
