"use client"

export function AuthNotCompleted() {
  return (
    <div className="flex flex-col gap-y-4 items-center justify-center">
      <div className="h-[35vh] w-full bg-brand" />
      <p className="text-danger">You auth flow not completed</p>
      <p>In short, there is a mistake here</p>
      <p>You got this error because you entered url in searchbar that needs to success message if auth completed</p>
      <p>Now close this page</p>
    </div>
  )
}
