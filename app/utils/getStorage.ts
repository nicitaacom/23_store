import { DBStorage } from "@/storages/DBStorage"
import { LocalStorage } from "@/storages/LocalStorage"
import useUserStore from "@/store/user/userStore"

export function getStorage() {
  const { isAuthenticated } = useUserStore.getState()
  return isAuthenticated ? new DBStorage() : new LocalStorage()
}
