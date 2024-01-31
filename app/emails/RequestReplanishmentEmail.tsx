import { Head, Html, Preview, Body, Section, Img, Heading, Text, Link } from "@react-email/components"
import { Tailwind } from "@react-email/tailwind"

import { TProductDB } from "@/interfaces/product/TProductDB"
import { formatCurrency } from "../utils/currencyFormatter"
import { getURL } from "@/utils/helpers"

interface RequestReplanishmentEmailProps {
  product: TProductDB
}

export const RequestReplanishmentEmail = ({ product }: RequestReplanishmentEmailProps) => {
  const previewText = `User requested replanishment`
  return (
    <Tailwind
      config={{
        theme: {
          screens: {
            // read dev_readme.md
          },
          extend: {
            colors: {
              brand: "#1ce956",
              subTitle: "#999999",
              "broder-color": "#999999",
              title: "#e0e0e0",
              info: "407ded",
            },
          },
        },
      }}>
      <Html>
        <Head />
        <Preview>{previewText}</Preview>

        <Body className="bg-[#202020]" style={{ width: "480px", margin: "0 auto", padding: "20px 0 48px" }}>
          {/* CONTENT - START */}

          {/* HEADER */}
          <Section style={{ width: "480px", maxWidth: "480px" }}>
            <Heading className="m-0 pt-8 text-title text-center">{previewText}</Heading>
            <Text className="m-0 pb-8 text-subTitle text-center">User requested replanishment ↻</Text>
          </Section>

          {/* MAIN CONTENT */}
          <Section className="w-[480px] max-w-[480px] mb-2 border border-solid border-border-color pb-0">
            {product && (
              <Section>
                <Img
                  style={{ objectFit: "cover" }}
                  src={product.img_url[0]}
                  width="480"
                  height="240"
                  alt={product.title}
                />
                <Text className="m-0 px-4 py-2 text-title text-2xl text-center">{product.title}</Text>
                <Text className="mb-8 mt-0 text-title text-xl text-center">{formatCurrency(product.price)}</Text>
              </Section>
            )}
          </Section>

          {/* FOOTER */}
          <table
            style={{
              borderTop: "2px solid #999999",
              minWidth: "100%",
              margin: "1rem 0rem",
              padding: "1rem 0rem",
              textAlign: "center",
            }}>
            <tr>
              <td>
                <Link className="m-0 text-[#407ded] text-sm text-center mr-4" href={`${getURL()}support`}>
                  Support
                </Link>
                <Link className="m-0 text-[#407ded] text-sm text-center mr-4" href={`${getURL()}feedback`}>
                  Feedback
                </Link>
                <Link
                  className="m-0 text-[#407ded] text-sm text-center"
                  href={`${getURL()}unsubscribe?request-replanishment`}>
                  Unsubscribe
                </Link>
              </td>
            </tr>
          </table>
          {/* CONTENT - END */}
        </Body>
      </Html>
    </Tailwind>
  )
}

export default RequestReplanishmentEmail