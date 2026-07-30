import { fn } from "storybook/test";

import { createDeferred, type IDeferred } from "./deferred";

type TArchiveDownload = { fileName: string; archiveFile: Blob };

let tablesExportDeferred: IDeferred<TArchiveDownload> | null = null;

export const backupSDK = {
  exportTables: fn((onProgress: (done: number, total: number) => void) => {
    onProgress(1, 4);
    tablesExportDeferred = createDeferred<TArchiveDownload>();
    return tablesExportDeferred.promise;
  }),
  importTables: fn(async () => ({ tables: [] })),
  exportFiles: fn(async (onProgress: (progress: {
    bytesDone: number;
    bytesTotal: number;
    label: string;
    speedBytesPerMs: number | null;
  }) => void) => {
    onProgress({ bytesDone: 1024, bytesTotal: 4096, label: "23_public-images/example.png", speedBytesPerMs: 2 });
    return { fileName: "files.tar.gz", archiveFile: new Blob([], { type: "application/gzip" }) };
  }),
  importFiles: fn(async () => ({ buckets: [] })),
};

export function completeTablesExport() {
  if (!tablesExportDeferred) throw new Error("Tables export has not started");
  tablesExportDeferred.resolve({
    fileName: "tables.tar.gz",
    archiveFile: new Blob([], { type: "application/gzip" }),
  });
  tablesExportDeferred = null;
}
