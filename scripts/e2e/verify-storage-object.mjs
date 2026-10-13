import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { createClient } from "@supabase/supabase-js"
import { createHash } from "node:crypto"

function isMissingObject(error) {
  return ["NotFound", "NoSuchKey", "404"].includes(error?.name)
    || error?.$metadata?.httpStatusCode === 404
    || error?.statusCode === "404"
    || error?.status === 404
    || /not found|object not found/i.test(error?.message ?? "")
}

export async function verifyStorageObjectAbsent(environment, reference) {
  if (!reference?.provider || !reference?.bucket || !reference?.path || reference.path.includes("*")) {
    throw new Error("Storage absence readback requires one exact provider, bucket, and object path")
  }

  if (reference.provider === "r2") {
    const accountId = environment.R2_ACCOUNT_ID
    const accessKeyId = environment.R2_ACCESS_KEY_ID
    const secretAccessKey = environment.R2_SECRET_ACCESS_KEY
    if (!accountId || !accessKeyId || !secretAccessKey) throw new Error("R2 object readback settings are missing")
    const client = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      region: "auto",
      credentials: { accessKeyId, secretAccessKey },
    })
    try {
      await client.send(new HeadObjectCommand({ Bucket: reference.bucket, Key: reference.path }))
      throw new Error("Storage object remains after the application deletion route completed")
    } catch (error) {
      if (isMissingObject(error)) return `r2:${reference.bucket}/${reference.path}:absent`
      throw error
    } finally {
      client.destroy()
    }
  }

  if (reference.provider === "supabase") {
    const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase Storage readback settings are missing")
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await supabase.storage.from(reference.bucket).download(reference.path)
    if (data) throw new Error("Storage object remains after the application deletion route completed")
    if (!isMissingObject(error)) throw new Error("Supabase Storage could not verify object absence")
    return `supabase:${reference.bucket}/${reference.path}:absent`
  }

  throw new Error(`Unsupported storage provider: ${reference.provider}`)
}

export async function verifyStorageObjectPresent(environment, reference, expected) {
  if (!reference?.provider || !reference?.bucket || !reference?.path || reference.path.includes("*")) {
    throw new Error("Storage presence readback requires one exact provider, bucket, and object path")
  }
  if (!Number.isSafeInteger(expected?.size) || expected.size < 1 || !/^[a-f0-9]{64}$/i.test(expected?.sha256 ?? "")) {
    throw new Error("Storage presence readback requires the exact byte count and SHA-256 digest")
  }

  let bytes
  if (reference.provider === "r2") {
    const accountId = environment.R2_ACCOUNT_ID
    const accessKeyId = environment.R2_ACCESS_KEY_ID
    const secretAccessKey = environment.R2_SECRET_ACCESS_KEY
    if (!accountId || !accessKeyId || !secretAccessKey) throw new Error("R2 object readback settings are missing")
    const client = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      region: "auto",
      credentials: { accessKeyId, secretAccessKey },
    })
    try {
      const response = await client.send(new GetObjectCommand({ Bucket: reference.bucket, Key: reference.path }))
      if (!response.Body) throw new Error("R2 returned an empty storage object")
      bytes = Buffer.from(await response.Body.transformToByteArray())
    } finally {
      client.destroy()
    }
  } else if (reference.provider === "supabase") {
    const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase Storage readback settings are missing")
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await supabase.storage.from(reference.bucket).download(reference.path)
    if (error || !data) throw new Error("Supabase Storage could not read the run-owned object")
    bytes = Buffer.from(await data.arrayBuffer())
  } else {
    throw new Error(`Unsupported storage provider: ${reference.provider}`)
  }

  const actualSha256 = createHash("sha256").update(bytes).digest("hex")
  if (bytes.length !== expected.size || actualSha256 !== expected.sha256.toLowerCase()) {
    throw new Error("Stored object bytes differ from the uploaded run-owned image")
  }
  return `${reference.provider}:${reference.bucket}/${reference.path}:bytes:${bytes.length}:sha256:${actualSha256}`
}
