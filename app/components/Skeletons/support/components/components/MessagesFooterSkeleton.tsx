export function MessagesFooterSkeleton() {
  return (
    <div className="w-full border-t border-border-color/35 bg-background/55 px-3 py-3">
      <div className="flex animate-pulse items-end gap-2 rounded border border-border-color/25 bg-background/60 px-3 py-2">
        <div className="h-6 flex-1 rounded bg-foreground/40" />
        <div className="h-8 w-8 shrink-0 rounded bg-foreground/60" />
      </div>
    </div>
  )
}
