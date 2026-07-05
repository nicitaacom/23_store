export function DesktopSidebarSkeleton() {
  return (
    <aside className="hidden h-full w-[320px] shrink-0 laptop:flex">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border-color/35 bg-foreground/5">
        <div className="animate-pulse border-b border-border-color/35 px-3 py-3">
          <div className="h-2.5 w-24 rounded bg-foreground/40" />
          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <div className="h-4 w-28 rounded bg-foreground/60" />
              <div className="mt-2 h-2.5 w-40 rounded bg-foreground/40" />
            </div>
            <div className="h-5 w-8 rounded bg-foreground/40" />
          </div>
          <div className="mt-3 h-9 w-full rounded-lg bg-foreground/40" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex animate-pulse items-start gap-2 rounded-md bg-background/20 px-2.5 py-2.5">
              <div className="h-10 w-10 shrink-0 rounded-md bg-foreground/60" />
              <div className="min-w-0 flex-1">
                <div className="h-3 w-24 rounded bg-foreground/60" />
                <div className="mt-2 h-2.5 w-40 rounded bg-foreground/40" />
                <div className="mt-2 h-2 w-16 rounded bg-foreground/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
