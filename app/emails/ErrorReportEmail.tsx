import { Html } from "@react-email/html"
import { Head } from "@react-email/head"
import { Body } from "@react-email/body"
import { Container } from "@react-email/container"
import { Heading } from "@react-email/heading"
import { Text } from "@react-email/text"
import { Hr } from "@react-email/hr"

interface ErrorReportEmailProps {
  message: string
  digest?: string
  pageUrl: string | null
}

/**
 *
 * This does not require translation because this email will be sent to support - support speaks english
 */
// http://localhost:6006/?path=/story/foundations-errorboundary--render-crash
export function ErrorReportEmail({ message, digest, pageUrl }: ErrorReportEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Error Report 🐛</Heading>
          <Text style={text}>A buyer hit an error boundary and reported it from the page below.</Text>

          <Hr style={hr} />

          {pageUrl && (
            <Text style={text}>
              Page: <span style={mono}>{pageUrl}</span>
            </Text>
          )}
          {digest && (
            <Text style={text}>
              Error ID: <span style={mono}>{digest}</span>
            </Text>
          )}
          <Text style={text}>
            Message: <span style={mono}>{message}</span>
          </Text>

          <Hr style={hr} />
          <Text style={footer}>Sent from your e-commerce store</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
  borderRadius: "8px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
}

const h1 = {
  color: "#ef4444",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "40px 0 20px",
  padding: "0 40px",
}

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 40px",
}

const mono = {
  fontFamily: "monospace",
  color: "#111827",
}

const hr = {
  borderColor: "#e5e7eb",
  margin: "26px 0",
}

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  padding: "0 40px",
  marginTop: "32px",
  textAlign: "center" as const,
}
