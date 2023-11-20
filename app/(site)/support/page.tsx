import { Button } from "@/components/ui"
import { contact } from "@/constant/contacts"

export default function SupportPage() {
  return (
    <div className="w-full h-[calc(100vh-64px)] flex flex-col gap-y-8 justify-center items-center">
      <div className="flex flex-col gap-y-2 justify-center items-center">
        <h1>Get support per email</h1>
        <p>{process.env.NEXT_PUBLIC_SUPPORT_EMAIL}</p>
      </div>

      <div className="flex flex-col gap-y-2 justify-center items-center">
        <h1>Get support in chat</h1>
        <p>Just click in bottom right corner</p>
      </div>

      <div className="flex flex-col gap-y-2 justify-center items-center">
        <h1>Get support in telegram</h1>
        <Button className="text-info hover:text-info hover:opacity-[99]" variant="link" href={contact.telegram}>
          {contact.telegram}
        </Button>
      </div>
    </div>
  )
}
