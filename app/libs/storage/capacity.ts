import { randomUUID } from "node:crypto"

import { storageRedis } from "./state"
import { StorageRequestError } from "./errors"
import { r2Config } from "@/config/r2Config"
import type { IStorageProvider } from "@/ts/storage"

export const STORAGE_CAPACITY_BYTES = r2Config.totalForAllUsersGB * 1000 ** 3
type TCapacityReservation = { bytes: number; stagePath?: string; releaseAfter: number }
const reservationsKey = (provider: IStorageProvider) => `storage:23:capacity:${provider.name}:reservations`

async function withCapacityLock<T>(provider: IStorageProvider, operation: (verifyLease: () => Promise<void>) => Promise<T>): Promise<T> {
  const redis = storageRedis()
  const key = `storage:23:capacity:${provider.name}:lock`
  const lease = randomUUID()
  if (!await redis.set(key, lease, { nx: true, ex: 180 })) throw new StorageRequestError("Storage capacity is being verified; try again", 503)
  let lost = false
  const renewal = setInterval(() => {
    void redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], 180) end return 0", [key], [lease])
      .then(result => { if (result !== 1) lost = true }).catch(() => { lost = true })
  }, 30000)
  renewal.unref()
  const verifyLease = async () => {
    if (lost || await redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], 180) end return 0", [key], [lease]) !== 1)
      throw new Error("Storage capacity lease expired; verify the stored inventory")
  }
  try {
    const operationResp = await operation(verifyLease)
    await verifyLease()
    return operationResp
  } finally {
    clearInterval(renewal)
    await redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0", [key], [lease])
  }
}

async function pendingCapacity(provider: IStorageProvider): Promise<number> {
  const redis = storageRedis()
  const records = await redis.hgetall<Record<string, TCapacityReservation | string>>(reservationsKey(provider)) ?? {}
  let bytes = 0
  for (const [id, value] of Object.entries(records)) {
    const record: TCapacityReservation = typeof value === "string" ? JSON.parse(value) : value
    if (!Number.isSafeInteger(record.bytes) || record.bytes < 1 || !Number.isFinite(record.releaseAfter)) throw new Error("Storage reservation is invalid")
    if (record.releaseAfter < Date.now()) {
      // Retain reservations for a full day beyond signing, including incomplete transfers.
      // Physical deletion belongs to scheduled staging cleanup; usage reads never delete files.
      if (record.stagePath && await provider.inspect("23_support-guest-images", record.stagePath, true)) bytes += record.bytes
      else await redis.hdel(reservationsKey(provider), id)
    } else bytes += record.bytes
  }
  return bytes
}

export async function reserveStorageCapacity(provider: IStorageProvider, id: string, bytes: number, stagePath?: string): Promise<void> {
  if (!Number.isSafeInteger(bytes) || bytes < 1) throw new StorageRequestError("Invalid storage reservation")
  await withCapacityLock(provider, async verifyLease => {
    const pending = await pendingCapacity(provider)
    const stored = await provider.measureBytes()
    if (!Number.isSafeInteger(stored) || stored < 0) throw new Error("Storage usage is unknown")
    if (stored + pending + bytes > STORAGE_CAPACITY_BYTES)
      throw new StorageRequestError(`The shared ${r2Config.totalForAllUsersGB} GB upload limit has been reached. Try a smaller file or remove unused files.`, 413)
    await verifyLease()
    await storageRedis().hset(reservationsKey(provider), { [id]: JSON.stringify({ bytes, stagePath, releaseAfter: Date.now() + 26 * 60 * 60 * 1000 }) })
  })
}

export async function settleStorageCapacity<T>(provider: IStorageProvider, id: string, publish: () => Promise<T>): Promise<T> {
  return withCapacityLock(provider, async verifyLease => {
    if (!await storageRedis().hexists(reservationsKey(provider), id)) throw new StorageRequestError("Storage capacity reservation expired", 409)
    await verifyLease()
    const publishResp = await publish()
    await verifyLease()
    await storageRedis().hdel(reservationsKey(provider), id)
    return publishResp
  })
}

export async function cancelStorageCapacity(provider: IStorageProvider, id: string): Promise<void> {
  await withCapacityLock(provider, () => storageRedis().hdel(reservationsKey(provider), id).then(() => undefined))
}

export async function selectStorageCapacity(provider: IStorageProvider): Promise<number> {
  return withCapacityLock(provider, async () => await pendingCapacity(provider) + await provider.measureBytes())
}
