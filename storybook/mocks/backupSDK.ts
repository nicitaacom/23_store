import { fn } from "storybook/test";

import { createDeferred, type IDeferred } from "./deferred";
import type { TFilesImportResult } from "@/sdk/BackupSDK/BackupSDK";
import type { TStorageProviderName } from "@/ts/storage";

type TExportDownload = { fileName: string; exportFile: Blob };

let tablesExportDeferred: IDeferred<TExportDownload> | null = null;
let filesImportDeferred: IDeferred<TFilesImportResult> | null = null;
const relink = { rowsUpdated: 0, urlsUpdated: 0, authUsersUpdated: 0, unresolvedReferences: 0, unresolvedPaths: 0, tables: [] };

export const backupSDK = {
  exportTables: fn((onProgress: (done: number, total: number) => void) => {
    onProgress(1, 4);
    tablesExportDeferred = createDeferred<TExportDownload>();
    return tablesExportDeferred.promise;
  }),
  importTables: fn(async () => ({ accounts: { created: 0, reused: 0, passwordResetRequired: 0 }, tables: [], relink })),
  exportFiles: fn(async (onProgress: (progress: {
    bytesDone: number;
    bytesTotal: number;
    label: string;
    speedBytesPerMs: number | null;
  }) => void) => {
    onProgress({ bytesDone: 1024, bytesTotal: 4096, label: "23_product-images/example.png", speedBytesPerMs: 2 });
    return { fileName: "files.tar.gz", exportFile: new Blob([], { type: "application/gzip" }) };
  }),
  importFiles: fn((_file: File, onProgress: (progress: { bytesDone: number; bytesTotal: number; label: string; speedBytesPerMs: number | null }) => void, _provider?: TStorageProviderName) => {
    onProgress({ bytesDone: 1024, bytesTotal: 4096, label: "23_product-images/example.png", speedBytesPerMs: 2 });
    filesImportDeferred = createDeferred<TFilesImportResult>();
    return filesImportDeferred.promise;
  }),
};

export function completeTablesExport() {
  if (!tablesExportDeferred) throw new Error("Tables export has not started");
  tablesExportDeferred.resolve({
    fileName: "tables.tar.gz",
    exportFile: new Blob([], { type: "application/gzip" }),
  });
  tablesExportDeferred = null;
}

export function completeFilesImport() {
  if (!filesImportDeferred) throw new Error("Files import has not started");
  filesImportDeferred.resolve({ buckets: [{ bucket: "23_product-images", files: 1, failed: 0 }], relink: null });
  filesImportDeferred = null;
}
