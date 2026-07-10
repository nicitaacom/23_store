import useUser from "@/store/user/useUser"
import { DBStorage } from "@/storages/DBStorage"
import { LocalStorage } from "@/storages/LocalStorage"

export function getStorage() {
  const { user } = useUser.getState()
  return user ? new DBStorage() : new LocalStorage()
}
