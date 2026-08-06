import moment from "moment-timezone"

import { slugify } from "@/utils/slugify"

const FALLBACK_EXTENSION = "png"

/**
 * A chat image is pasted, and a paste always arrives as `image.png` - there is nothing in that name
 * worth keeping, and every paste would fight over the same one. The moment it arrived is the one
 * fact the file does have, so it becomes the name: `2026-07-29_at_22-19-54.png`.
 *
 * Europe/Berlin, the same zone `sendMessageFn` stamps a message's created_at with, so a file name
 * and the message it belongs to read as the same clock.
 */
export function getTimestampFileName(fileName: string): string {
  const extension = slugify(fileName.split(".").pop() ?? "") || FALLBACK_EXTENSION

  return `${moment().tz("Europe/Berlin").format("YYYY-MM-DD_[at]_HH-mm-ss")}.${extension}`
}
