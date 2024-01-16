import { Resend } from "resend"

export const resend = new Resend(process.env.NEXT_RESEND_SECRET)
