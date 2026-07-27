export function MessagesBodySkeleton() {
  return (
    <div className="min-h-0 flex-1 bg-background/35 px-3 py-3 laptop:px-4">
      <div className="flex animate-pulse flex-col gap-3">
        {[false, true, false, true].map((isOwn, index) => (
          <div className={`flex w-full items-end gap-2 ${isOwn ? "justify-end" : ""}`} key={index}>
            {!isOwn && <div className="h-8 w-8 shrink-0 rounded bg-foreground/60" />}
            <div className={`h-12 rounded bg-foreground/40 ${isOwn ? "w-[45%]" : "w-[60%]"}`} />
          </div>
        ))}
      </div>
    </div>
  )
}
