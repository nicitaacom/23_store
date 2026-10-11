import { storageRedis } from "./state"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import type { Json } from "@/ts/types_db"

export async function compareStorageReferences(
  table: string, rowKey: Record<string, unknown>, before: Record<string, unknown>, after: Record<string, unknown>,
): Promise<boolean> {
  const record = { table, rowKey, before, after, at: new Date().toISOString() }
  const redis = storageRedis()
  await redis.lpush("storage:23:references", JSON.stringify({ ...record, status: "prepared" }))
  const { data: updated, error } = await supabaseAdmin.rpc("23_storage_update_references", {
    table_name: table, row_key: rowKey as Json, before_values: before as Json, after_values: after as Json,
  })
  if (error) throw new Error(error.message)
  await redis.lpush("storage:23:references", JSON.stringify({ ...record, status: updated ? "complete" : "conflict" }))
  return updated === true
}
