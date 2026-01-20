export function MemoryDebug({ memory }: { memory: string }) {
  if (process.env.NODE_ENV !== "development") return null

  return (
    <div className="fixed top-16 right-4 max-w-xs p-3 bg-warning/10 border border-warning rounded-lg shadow-lg z-50">
      <h4 className="text-xs font-bold text-warning mb-1.5">DEV: Memory</h4>
      <p className="text-xs text-title break-words">{memory || "No memory yet"}</p>
    </div>
  )
}
