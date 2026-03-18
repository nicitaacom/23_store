import { DBStorage } from "@/storages/DBStorage"
import { LocalStorage } from "@/storages/LocalStorage"
import useUserStore from "@/store/user/userStore"

export function getStorage() {
  const { user } = useUserStore.getState()
  return user ? new DBStorage() : new LocalStorage()
}
