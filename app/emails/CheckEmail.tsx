// do it in this way to reduce bundle size for better performance - https://github.com/resend/react-email/issues/1329#issuecomment-1980561233
import { Html } from "@react-email/html"
import { Head } from "@react-email/head"
import { Preview } from "@react-email/preview"
import { Body } from "@react-email/body"
import { Section } from "@react-email/section"
import { Img } from "@react-email/img"
import { Heading } from "@react-email/heading"
import { Text } from "@react-email/text"
import { Link } from "@react-email/link"
import { Tailwind } from "@react-email/tailwind"

import { formatCurrency } from "../utils/currencyFormatter"
import { TProductAfterDB } from "../ts/product/TProductAfterDB"
import { getURL } from "@/utils/helpers"
import { twMerge } from "tailwind-merge"
import { Fragment } from "react"
import { toProductLocale } from "@/utils/product"

interface CheckEmailProps {
  products: TProductAfterDB[]
  locale: string
  deliveryDate: string
  previewText: string
  orderConfirmed: string
  willBeDelivered: string
  quantityText: string
  totalText: string
  trackYourOrder: string
  weKeepYouUpdated: string
  supportText: string
  feedbackText: string
  allRightsReserved: string
}

export const CheckEmail = ({
  products,
  locale,
  deliveryDate,
  previewText,
  orderConfirmed,
  willBeDelivered,
  quantityText,
  totalText,
  trackYourOrder,
  weKeepYouUpdated,
  supportText,
  feedbackText,
  allRightsReserved,
}: CheckEmailProps) => {
  const productLocale = toProductLocale(locale)
  const totalAmount = products.reduce((total, product) => total + product.price * product.quantity, 0)

  return (
    <Tailwind
      config={{
        theme: {
          extend: {
            colors: {
              brand: "#1ce956",
              subTitle: "#666666",
              "border-color": "#e5e5e5",
              title: "#1a1a1a",
            },
          },
        },
      }}>
      <Fragment>
        <Html>
          <Head />
          <Preview>{previewText}</Preview>

          <Body className="bg-[#f9fafb]" style={{ width: "600px", margin: "0 auto", padding: "40px 20px" }}>
            {/* HEADER */}
            <Section
              style={{
                width: "100%",
                maxWidth: "600px",
                background: "#ffffff",
                borderRadius: "12px",
                padding: "40px",
                marginBottom: "24px",
              }}>
              <Heading className="m-0 text-[32px] font-bold text-title text-center" style={{ lineHeight: "1.3" }}>
                {orderConfirmed}
              </Heading>
              <Text className="m-0 mt-3 text-[16px] text-subTitle text-center" style={{ lineHeight: "1.5" }}>
                {willBeDelivered} <strong style={{ color: "#1a1a1a" }}>{deliveryDate}</strong>
              </Text>
            </Section>

            {/* PRODUCTS */}
            <Section
              style={{
                width: "100%",
                maxWidth: "600px",
                background: "#ffffff",
                borderRadius: "12px",
                padding: "32px",
                marginBottom: "16px",
              }}>
              {products?.map((product, index) => {
                const translation = product.translations[productLocale] ?? product.translations.fi

                return (
                  <Section
                    className={twMerge(index !== products.length - 1 && "pb-6 mb-6 border-b border-[#e5e5e5]")}
                    key={product.id}
                    style={{ padding: 0 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tr>
                        <td style={{ width: "120px", verticalAlign: "top", paddingRight: "20px" }}>
                          <Img
                            style={{ objectFit: "cover", borderRadius: "8px", display: "block" }}
                            src={product.selectedVariant?.image_url || product.img_url[0]}
                            width="120"
                            height="120"
                            alt={product.selectedVariant?.label || translation.title}
                          />
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          <Text
                            className="m-0 text-[18px] font-semibold text-title"
                            style={{ lineHeight: "1.4", marginBottom: "8px" }}>
                            {translation.title}
                          </Text>
                          <Text className="m-0 text-[14px] text-subTitle" style={{ lineHeight: "1.5", marginBottom: "12px" }}>
                            {quantityText}: {product.quantity}
                          </Text>
                          {product.selectedVariant?.label && (
                            <Text className="m-0 text-[14px] text-subTitle" style={{ lineHeight: "1.5", marginBottom: "12px" }}>
                              Variant: {product.selectedVariant.label}
                            </Text>
                          )}
                          <Text className="m-0 text-[16px] font-medium text-title">
                            {formatCurrency(product.price * product.quantity)}
                          </Text>
                        </td>
                      </tr>
                    </table>
                  </Section>
                )
              })}

              {/* TOTAL */}
              <Section style={{ borderTop: "2px solid #e5e5e5", paddingTop: "24px", marginTop: "24px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tr>
                    <td style={{ textAlign: "left" }}>
                      <Text className="m-0 text-[20px] font-bold text-title">{totalText}</Text>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Text className="m-0 text-[24px] font-bold text-title">{formatCurrency(totalAmount)}</Text>
                    </td>
                  </tr>
                </table>
              </Section>
            </Section>

            {/* CTA SECTION */}
            <Section
              style={{
                width: "100%",
                maxWidth: "600px",
                background: "#ffffff",
                borderRadius: "12px",
                padding: "32px",
                marginBottom: "24px",
                textAlign: "center",
              }}>
              <Link
                href={`${getURL()}track-order`}
                style={{
                  display: "inline-block",
                  background: "#1ce956",
                  color: "#ffffff",
                  padding: "14px 32px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                }}>
                {trackYourOrder}
              </Link>
              <Text className="m-0 text-[14px] text-subTitle" style={{ lineHeight: "1.5" }}>
                {weKeepYouUpdated}
              </Text>
            </Section>

            {/* FOOTER */}
            <Section style={{ width: "100%", maxWidth: "600px", textAlign: "center", paddingTop: "24px" }}>
              <Text className="m-0 text-[14px] text-subTitle mb-3">Need help with your order?</Text>
              <table style={{ width: "100%", textAlign: "center" }}>
                <tr>
                  <td>
                    <Link
                      className="text-[14px] text-[#1ce956] mx-3"
                      href={`${getURL()}support`}
                      style={{ textDecoration: "none", fontWeight: "500" }}>
                      {supportText}
                    </Link>
                    <Link
                      className="text-[14px] text-[#1ce956] mx-3"
                      href={`${getURL()}feedback`}
                      style={{ textDecoration: "none", fontWeight: "500" }}>
                      {feedbackText}
                    </Link>
                  </td>
                </tr>
              </table>
              <Text className="m-0 mt-6 text-[12px] text-subTitle" style={{ lineHeight: "1.5" }}>
                © {new Date().getFullYear()} Joki. {allRightsReserved}
              </Text>
            </Section>
          </Body>
        </Html>
      </Fragment>
    </Tailwind>
  )
}

export default CheckEmail
