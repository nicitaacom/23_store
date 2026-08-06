import { TBuckets } from "@/ts/types/TBuckets"
import { getUserId } from "@/utils/getUserId"
import { slugifyEmail } from "@/utils/slugify"
import { useDeviceIdStore } from "@/store/user/useDeviceIdStore"
import useUser from "@/store/user/useUser"

function selectSignedInEmailSlug(): string | null {
  const signedInEmail = useUser.getState().user?.email

  return signedInEmail ? slugifyEmail(signedInEmail) : null
}

/**
 * A visitor who is not signed in still gets one folder of their own, keyed on the deviceId the UTM
 * identity system already resolved for them (`useDeviceIdStore`, see
 * app/[locale]/(site)/stats/dev_readme-device-id.md). The same visitor lands in the same folder on
 * every visit, which is what makes "show me this guest's images" a single folder listing.
 *
 * The store holds the transport form of the deviceId - the signed id itself stays on the server -
 * so the folder is that transport string. It is 1:1 with the signed id, so it identifies the same
 * visitor just as well. The anonymousId cookie is the fallback for a visit that reached an upload
 * before UTMTracker had written a deviceId.
 */
function selectGuestFolder(): string {
  return useDeviceIdStore.getState().storedDeviceId ?? getUserId()
}

/** The folder for an upload any visitor may make - signed in or not, one bucket either way. */
export function getUploadFolder(): string {
  return selectSignedInEmailSlug() ?? selectGuestFolder()
}

/**
 * Support-chat images are split by bucket as well as by folder: a signed-in sender's image is kept
 * with the account it belongs to, a guest's image goes to the bucket a weekly pg_cron job sweeps
 * (see dev_readme-supbase-sql.md, GUEST SUPPORT IMAGES CLEANUP).
 */
export function getSupportImageBucketAndFolder(): { bucket: TBuckets; folder: string } {
  const signedInEmailSlug = selectSignedInEmailSlug()

  return signedInEmailSlug
    ? { bucket: "23_support-images", folder: signedInEmailSlug }
    : { bucket: "23_support-guest-images", folder: selectGuestFolder() }
}
