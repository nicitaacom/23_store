export function MessagesHeaderSkeleton() {
  return (
    <div className="flex animate-pulse items-center justify-between gap-3 border-b border-border-color/30 bg-foreground/10 px-3 py-3 tablet:px-4">
      <div className="flex min-w-0 items-center gap-3">
        {/* AVATAR */}
        <div className="h-10 w-10 shrink-0 rounded-md bg-foreground/60" />
        <div className="min-w-0">
          {/* EYEBROW */}
          <div className="h-2 w-24 rounded bg-foreground/40" />
          {/* TITLE */}
          <div className="mt-2 h-4 w-40 rounded bg-foreground/60" />
        </div>
      </div>
      {/* STATUS BADGE */}
      <div className="h-5 w-16 shrink-0 rounded bg-foreground/40" />
    </div>
  )
}
