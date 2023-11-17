export default function NoUserFoundAfterExchangingCookies() {
  return (
    <div className="flex flex-col gap-y-4 items-center justify-center">
      <div className="h-[35vh] w-full bg-brand" />
      <p className="text-danger">No user found after exchanging cookies</p>
      <p>In short, there is a mistake here</p>
      <p>Please message our team about this error - {process.env.NEXT_PUBLIC_SUPPORT_EMAIL}</p>
    </div>
  )
}
