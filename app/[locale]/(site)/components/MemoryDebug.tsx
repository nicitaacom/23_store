type MemoryDebugProps = {
  memory: string
  debugContext: API.AISalesAssistantDebug | null
}

function renderRecentSourceLabel(source: API.AISalesAssistantDebug["recentSource"] | undefined): string {
  if (source === "upstash") return "Upstash"
  if (source === "browser-fallback") return "Browser fallback"
  if (source === "merged") return "Merged"
  return "Unknown"
}

// http://localhost:6006/?path=/story/admin-admintools--utm-stats
export function MemoryDebug({ memory, debugContext }: MemoryDebugProps) {
  if (process.env.NODE_ENV !== "development") return null

  return (
    <details className="w-full rounded-2xl border border-warning/40 bg-warning/10 p-3 shadow-lg shadow-warning/5">
      <summary className="cursor-pointer list-none text-sm font-semibold text-warning">
        DEV memory panel
      </summary>

      <div className="mt-3 space-y-3">
        <div>
          <h4 className="mb-1.5 text-xs font-bold text-warning">DEV: Working Memory</h4>
          <p className="break-words text-xs text-title">{memory || "No memory yet"}</p>
        </div>

        <div>
          <h4 className="mb-1.5 text-xs font-bold text-warning">DEV: Pinecone Context</h4>
          <p className="break-words whitespace-pre-wrap text-xs text-title">
            {debugContext?.semanticContext || "No Pinecone semantic matches used yet"}
          </p>
        </div>

        <div>
          <h4 className="mb-1.5 text-xs font-bold text-warning">DEV: Pinecone Raw Matches</h4>
          {debugContext?.pineconeMatches?.length ? (
            <div className="space-y-1">
              {debugContext.pineconeMatches.map((match, index) => (
                <p className="break-words text-xs text-title" key={`${match.kind}-${match.role}-${index}`}>
                  <span className="font-semibold text-warning">
                    {match.kind === "working-memory" ? "Memory" : match.role === "assistant" ? "AI" : "User"}:
                  </span>{" "}
                  {match.text}
                </p>
              ))}
            </div>
          ) : (
            <p className="break-words text-xs text-title">No Pinecone matches returned yet</p>
          )}
        </div>

        <div>
          <h4 className="mb-1.5 text-xs font-bold text-warning">
            DEV: Recent Context ({renderRecentSourceLabel(debugContext?.recentSource)})
          </h4>
          {debugContext?.recentMessages?.length ? (
            <div className="space-y-1">
              {debugContext.recentMessages.map((message, index) => (
                <p className="break-words text-xs text-title" key={`${message.role}-${index}`}>
                  <span className="font-semibold text-warning">{message.role === "assistant" ? "AI" : "User"}:</span>{" "}
                  {message.content}
                </p>
              ))}
            </div>
          ) : (
            <p className="break-words text-xs text-title">No recent context used yet</p>
          )}
        </div>
      </div>
    </details>
  )
}
