import { Html } from "@react-email/html"
import { Head } from "@react-email/head"
import { Body } from "@react-email/body"
import { Container } from "@react-email/container"
import { Section } from "@react-email/section"
import { Heading } from "@react-email/heading"
import { Text } from "@react-email/text"
import { Hr } from "@react-email/hr"
import { Img } from "@react-email/img"
import { TProductAfterDB } from "@/ts/product/TProductAfterDB"
import { pt } from "@/utils/product"

interface RequestBetterPricesEmailProps {
  products: TProductAfterDB[]
  totalPrice: number
  userEmail: string | null
}

/**
 *
 * This does not require translation because this email will be sent to support - support speaks english
 */
export function RequestBetterPricesEmail({ products, totalPrice, userEmail }: RequestBetterPricesEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Better Price Request 💰</Heading>
          <Text style={text}>A customer has requested better prices for the following items:</Text>

          <Section style={productsSection}>
            <Heading style={h2}>Products:</Heading>
            {products.map((product, index) => {
              const translation = pt(product, "en")

              return (
                <div key={product.id} style={productCard}>
                  {product.img_url?.map(url => <Img key={url} src={url} alt={translation.title} style={productImage} />)}
                <Text style={productNumber}>#{index + 1}</Text>
                  <Text style={productName}>{translation.title}</Text>
                  {translation.description && <Text style={productSubtitle}>{translation.description}</Text>}
                <div style={productDetails}>
                  <Text style={productPrice}>Price: ${product.price.toFixed(2)}</Text>
                  <Text style={productQuantity}>Quantity: {product.quantity}</Text>
                  <Text style={productTotal}>Subtotal: ${(product.price * product.quantity).toFixed(2)}</Text>
                </div>
                </div>
              )
            })}
          </Section>

          <Hr style={hr} />

          <Section style={totalSection}>
            <Text style={totalLabel}>Total Amount:</Text>
            <Text style={totalPriceStyle}>${totalPrice.toFixed(2)}</Text>
          </Section>

          {userEmail && (
            <>
              <Hr style={hr} />
              <Section>
                <Text style={text}>
                  Customer Email:{" "}
                  <a href={`mailto:${userEmail}`} style={link}>
                    {userEmail}
                  </a>
                </Text>
              </Section>
            </>
          )}

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
  color: "#10b981",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "40px 0 20px",
  padding: "0 40px",
}

const h2 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "600",
  margin: "20px 0 16px",
}

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 40px",
}

const productsSection = {
  padding: "0 40px",
}

const productCard = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
  border: "1px solid #e5e7eb",
}

const productImage = {
  width: "100%",
  maxWidth: "200px",
  height: "auto",
  borderRadius: "6px",
  marginBottom: "12px",
}

const productNumber = {
  color: "#10b981",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 8px",
}

const productName = {
  color: "#111827",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 4px",
}

const productSubtitle = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0 0 12px",
}

const productDetails = {
  display: "flex",
  gap: "16px",
  flexDirection: "column" as const,
}

const productPrice = {
  color: "#374151",
  fontSize: "14px",
  margin: "0",
}

const productQuantity = {
  color: "#374151",
  fontSize: "14px",
  margin: "0",
}

const productTotal = {
  color: "#10b981",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0",
}

const hr = {
  borderColor: "#e5e7eb",
  margin: "26px 0",
}

const totalSection = {
  padding: "0 40px",
  textAlign: "center" as const,
}

const totalLabel = {
  color: "#6b7280",
  fontSize: "16px",
  margin: "0 0 8px",
}

const totalPriceStyle = {
  color: "#10b981",
  fontSize: "36px",
  fontWeight: "bold",
  margin: "0",
}

const link = {
  color: "#10b981",
  textDecoration: "underline",
}

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  padding: "0 40px",
  marginTop: "32px",
  textAlign: "center" as const,
}
