import type { NextPageContext } from "next"

type ErrorPageProps = {
  statusCode?: number
}

function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
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
        <h1 style={{ margin: 0, fontSize: "32px" }}>{statusCode || 500}</h1>
        <p style={{ marginTop: "12px", opacity: 0.8 }}>Something went wrong.</p>
      </div>
    </main>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode || err?.statusCode || 500
  return { statusCode }
}

export default ErrorPage
