"use client"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error }: ErrorPageProps) {
  const statusCode = (error as { statusCode?: number }).statusCode || 500

  return (
    <html>
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "#0b1016",
            color: "#f5f7fa",
            fontFamily: "system-ui, sans-serif",
          }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: "32px" }}>{statusCode}</h1>
            <p style={{ marginTop: "12px", opacity: 0.8 }}>Something went wrong.</p>
          </div>
        </main>
      </body>
    </html>
  )
}
