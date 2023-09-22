import {  Head, Html, Preview, Tailwind, Body, Container,
   Section, Img, Heading,Text,Column,Link } from "@react-email/components";
import { formatCurrency } from "../utils/currencyFormatter";
import { IProduct } from "../interfaces/IProduct";
import { baseURL } from "../utils/baseURL";

interface CheckEmailProps {
  products: IProduct[]
  deliveryDate:string
}

export const CheckEmail = ({ products,deliveryDate }: CheckEmailProps) => {

  const previewText = `Thank you for your purchace`;
  return (
    <Tailwind
        config={{
          theme: {
            screens: {
              mobile: "415px",
              // => @media (min-width: 415px) { ... }
              tablet: "768px",
              // => @media (min-width: 768px) { ... }
              laptop: "1024px",
              // => @media (min-width: 1024px) { ... }
              desktop: "1440px",
              // => @media (min-width: 1440px) { ... }
            },
            extend: {
              colors: {
                brand: "#1ce956",
                subTitle:"#999999",
                "broder-color":"#999999",
                "title":"#e0e0e0",
                "info":"407ded"
              },
            },
          },
        }}>
   <Html>
    <Head />
    <Preview>{previewText}</Preview>
    
      <Body className="bg-[#202020]">
      {/* CONTENT - START */}




        {/* HEADER */}
         <Column align="center">
             <Heading className="m-0 pt-8 text-title text-center">{previewText}</Heading>
             <Text className="m-0 pb-8 text-subTitle text-center">Your order will delivered on {deliveryDate}  🗓</Text>
          </Column>





{/* MAIN CONTENT */}
<Container style={{display:'flex',flexFlow:'column',justifyContent:'center',width:'480px',maxWidth:'480px'}}>
  {products &&
    products.length > 0 &&
    products.map((product) => (
      <Section
      style={{width:'480px',maxWidth:'480px',marginBottom:'0.5rem'}}  
      className="border-[1px] border-solid border-border-color pb-0"
        key={product.id}
      >
        <table
          align="center"
          width="100%"
          role="presentation"
          cellSpacing={0}
          cellPadding={0}
          border={0}
        >
          <tbody>
            <tr>
              <td width="480" height="240" style={{ verticalAlign: "top" }}>
                <Img
                style={{objectFit:'cover'}}
                  src={product.img_url[0]}
                  width="480"
                  height="240"
                  alt={product.title}
                />
              </td>
            </tr>
            <tr>
              <td style={{ padding: '1rem 0.5rem' }}>
                <table
                  width="100%"
                  role="presentation"
                  cellSpacing={0}
                  cellPadding={0}
                  border={0}
                >
                  <tbody>
                      <tr>
                        <Text className="m-0 text-title text-2xl text-center">
                          {product.title}
                        </Text>
                      </tr>
                      <tr>
                        <Text className="mb-8 mt-0 text-title text-xl text-center">
                          {formatCurrency(product.price)}
                        </Text>
                      </tr>
                    <tr>
                      <td>
                        <Text className="m-0 text-title text-lg text-center">Quantity:
                        <span className="m-0 text-subTitle">{product.quantity}</span> </Text>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <Text className="m-0 text-title text-lg text-center">Sub-total: <span className="m-0 text-subTitle">
                          {formatCurrency(product.price * product.quantity)}</span> </Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>
    ))}



</Container>




{/* TOTAL */}
<table style={{borderTop:'1px solid #999999',borderBottom:'1px solid #999999',minWidth:'100%',margin:'3rem 0rem',padding:'1rem 0rem',textAlign:'center'}}>
  <tr>
    <td>
       <Text className="m-0 text-title text-2xl text-center">Total:&nbsp;
        {formatCurrency(
                      products.reduce(
                        (totalPrice, product) => totalPrice + product.price * product.quantity,
                        0,
                      ),
                    )}
       </Text>
    </td>
  </tr>
</table>




{/* FOOTER */}
<table style={{borderTop:'1px solid #999999',minWidth:'100%',margin:'1rem 0rem',padding:'1rem 0rem',textAlign:'center'}}>
  <tr>
    <td>
       <Link className="m-0 text-[#407ded] text-sm text-center mr-4" href={`${baseURL}/support`}>Support</Link>
       <Link className="m-0 text-[#407ded] text-sm text-center mr-4" href={`${baseURL}/feedback`}>Feedback</Link>
       <Link className="m-0 text-[#407ded] text-sm text-center" href={`${baseURL}/track-order`}>Track order</Link>
    </td>
  </tr>
</table>





            

          {/* CONTENT - END */}
          </Body>
        </Html>
      </Tailwind>
  )
}


export default CheckEmail
