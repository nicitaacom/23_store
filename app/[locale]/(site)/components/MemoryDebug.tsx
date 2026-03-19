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

export function MemoryDebug({ memory, debugContext }: MemoryDebugProps) {
  if (process.env.NODE_ENV !== "development") return null

  return (
    <div className="fixed top-16 right-4 max-w-md w-[min(90vw,28rem)] p-3 bg-warning/10 border border-warning rounded-lg shadow-lg z-50 space-y-3 backdrop-blur-sm">
      <div>
        <h4 className="text-xs font-bold text-warning mb-1.5">DEV: Working Memory</h4>
        <p className="text-xs text-title break-words">{memory || "No memory yet"}</p>
      </div>

      <div>
        <h4 className="text-xs font-bold text-warning mb-1.5">DEV: Pinecone Context</h4>
        <p className="text-xs text-title break-words whitespace-pre-wrap">
          {debugContext?.semanticContext || "No Pinecone semantic matches used yet"}
        </p>
      </div>

      <div>
        <h4 className="text-xs font-bold text-warning mb-1.5">DEV: Pinecone Raw Matches</h4>
        {debugContext?.pineconeMatches?.length ? (
          <div className="space-y-1">
            {debugContext.pineconeMatches.map((match, index) => (
              <p key={`${match.kind}-${match.role}-${index}`} className="text-xs text-title break-words">
                <span className="font-semibold text-warning">
                  {match.kind === "working-memory" ? "Memory" : match.role === "assistant" ? "AI" : "User"}:
                </span>{" "}
                {match.text}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-title break-words">No Pinecone matches returned yet</p>
        )}
      </div>

      <div>
        <h4 className="text-xs font-bold text-warning mb-1.5">
          DEV: Recent Context ({renderRecentSourceLabel(debugContext?.recentSource)})
        </h4>
        {debugContext?.recentMessages?.length ? (
          <div className="space-y-1">
            {debugContext.recentMessages.map((message, index) => (
              <p key={`${message.role}-${index}`} className="text-xs text-title break-words">
                <span className="font-semibold text-warning">{message.role === "assistant" ? "AI" : "User"}:</span>{" "}
                {message.content}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-title break-words">No recent context used yet</p>
        )}
      </div>
    </div>
  )
}
