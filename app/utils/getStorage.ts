import { DBStorage } from "@/storages/DBStorage"
import { LocalStorage } from "@/storages/LocalStorage"
import useUserStore from "@/store/user/userStore"

export function getStorage() {
  const { isAuthenticated } = useUserStore.getState()
  console.log(7, "isAuthenticated - ", isAuthenticated)
  return isAuthenticated ? new DBStorage() : new LocalStorage()
}
