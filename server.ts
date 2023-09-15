import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import cors from 'cors'
import { Resend } from 'resend'
import dotenv from 'dotenv'
dotenv.config();

const baseURL = process.env.NODE_ENV === 'production' ? 'https://23-store.vercel.app' : 'http://localhost:8000';







/* server set up */
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({origin:`${baseURL}`}))
app.use(express.static('public'));

const port = 3000;
app.listen(port, () => {
     console.log(`Server is running on port ${port}`);
})

app.get('/', (_req: Request, res: Response) => {
  const htmlContent = `
    <html>
      <head>
        <style>
          body {
            background-color: black;
            color: white;
          }
        </style>
      </head>
      <body>
        Server running on port 3000
      </body>
    </html>
  `;
  res.send(htmlContent);
})










/* stripe set up */
const stripe = new Stripe(process.env.VITE_STRIPE_SECRET!, {
  apiVersion: '2023-08-16',
});

type lineItems = {
  price:string
  quantity:number
}

app.post('/create-checkout-session', async (req: Request, res: Response) => {
 try {
    const cartProducts = req.query as { lineItems: string[] };

    let lineItems: lineItems[];
    
    if (Array.isArray(cartProducts.lineItems)) {
      lineItems = cartProducts.lineItems.map((item) => JSON.parse(item));
    } else {
      lineItems = [JSON.parse(cartProducts.lineItems)];
    }
   
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${baseURL}/payment/?status=success`,
    cancel_url: `${baseURL}/payment/?status=canceled`,
    shipping_address_collection: {
    allowed_countries: ['DE'],
  },
  });

  if (session.url)
  res.redirect(303, session.url.toString());
 } catch (error) {
  console.log(error)
 }
})






/* email set up */

const resend = new Resend(process.env.VITE_RESEND_PUBLIC);

app.post('/send-email',  async (req: Request, res: Response) => {
  try {
    const { from, to, subject, html } = req.body;

    const data = await resend.emails.send({
      from:from,
      to:to,
      subject:subject,
      html:html,
    })
     res.sendStatus(200);

    console.log(data);
  } catch (error) {
    console.error(error);
     res.sendStatus(500);
  }
})