// One stable import point for the routes and the SDK: project-specific constants/types come from
// ./backupConfig, the pure archive plumbing from ./tarClient and ./csvClient.
export {
  BACKUP_TABLE_NAMES,
  BACKUP_TABLES,
  BACKUP_BUCKETS,
  getTableConfig,
  isBackupBucket,
  filterRowsByUuidColumns,
  getPublicUrl,
  listFiles,
} from "./backupConfig"
export type { TBackupTableName, TBackupTableConfig, TBackupBucket, TBackupFileRef } from "./backupConfig"

export { selectBackupSourceUsers, selectReferencedAuthUserIds, remapAuthUserIds, mergeBackupPublicUserRows } from "./backupAuthRestore"
export type { TBackupSourceUser, TBackupAuthMapping } from "./backupAuthRestore"

export { addTarEntry, finalizeTar, parseTar, gzipBufferClient, gunzipBufferClient } from "./tarClient"
export { toCsv, parseCsv } from "./csvClient"
