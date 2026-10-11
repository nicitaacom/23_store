import { createReadStream } from "node:fs"
import { randomUUID } from "node:crypto"
import { S3Client } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"

import { r2Credentials } from "@/libs/storage/config"
import { storageProvider, listStorageObjects } from "@/libs/storage/providers"
import { STORAGE_BUCKETS } from "@/libs/storage/references"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { reserveStorageCapacity, settleStorageCapacity } from "@/libs/storage/capacity"

export function migrationBackend(name) {
  const provider = storageProvider(name)
  const config = name === "r2" ? r2Credentials() : null
  const client = config ? new S3Client({ region: "auto", forcePathStyle: true, endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" }) : null
  return {
    name,
    identity: name === "r2" ? `${config.accountId}/${config.bucket}` : process.env.NEXT_PUBLIC_SUPABASE_URL,
    inspect: (bucket, objectPath) => provider.inspect(bucket, objectPath),
    delete: (bucket, objectPath) => provider.delete(bucket, objectPath),
    async inventory() {
      const objects = []
      for (const bucket of STORAGE_BUCKETS) {
        for (const object of await listStorageObjects(provider, bucket)) {
          const current = await provider.inspect(bucket, object.path)
          if (!current) throw new Error(`Source object disappeared: ${bucket}/${object.path}`)
          objects.push(current)
        }
      }
      return objects
    },
    async read(bucket, objectPath) {
      const response = await fetch(await provider.signDownload(bucket, objectPath), { signal: AbortSignal.timeout(300000) })
      if (!response.ok || !response.body) throw new Error(`File read failed (${response.status}): ${bucket}/${objectPath}`)
      return response.body
    },
    async put(file, temporary) {
      const reservation = `migration-${randomUUID()}`
      await reserveStorageCapacity(provider, reservation, file.byteCount)
      await settleStorageCapacity(provider, reservation, async () => {
      if (client) {
        const upload = new Upload({ client, params: { Bucket: config.bucket,
          Key: file.destinationKey, Body: createReadStream(temporary), ContentType: file.contentType,
          CacheControl: "max-age=0, must-revalidate", Metadata: { sha256: file.checksum } },
        partSize: 8 * 1024 ** 2, queueSize: 2, leavePartsOnError: false })
        await upload.done()
      } else {
        const { data: destination, error } = await supabaseAdmin.storage.from(file.bucket).createSignedUploadUrl(file.path, { upsert: true })
        if (error || !destination) throw new Error(error?.message ?? "Supabase upload signing failed")
        const response = await fetch(destination.signedUrl, { method: "PUT", headers: { "Content-Type": file.contentType, "x-upsert": "true",
          "cache-control": "max-age=0, must-revalidate" }, body: createReadStream(temporary), duplex: "half", signal: AbortSignal.timeout(300000) })
        if (!response.ok) throw new Error(`Supabase file upload failed (${response.status})`)
      }
      })
    },
  }
}

export async function inspectSourceAccess() {
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets()
  if (error || !buckets) throw new Error(error?.message ?? "Source bucket inspection failed")
  for (const bucket of STORAGE_BUCKETS) {
    const actual = buckets.find(candidate => candidate.id === bucket)
    if (!actual) throw new Error(`Missing source bucket: ${bucket}`)
    if (!actual.public) throw new Error(`Private source bucket differs from the public-only R2 architecture: ${bucket}`)
  }
  return buckets.filter(bucket => STORAGE_BUCKETS.includes(bucket.id)).map(bucket => ({ bucket: bucket.id, public: bucket.public }))
}
