import { stripeProductType } from "./src/interfaces/stripeProduct";

import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import paypal, { Payment } from 'paypal-rest-sdk';
import cors from 'cors'
import axios from 'axios'
import { Resend } from 'resend'
import dotenv from 'dotenv'
import { paypalProductType } from "./src/interfaces/paypalProduct";
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



app.post('/create-checkout-session', async (req: Request, res: Response) => {
 try {
    const cartProducts = req.query as { stripeProducts: string[] };

    let lineItems: stripeProductType[];
    
    if (Array.isArray(cartProducts.stripeProducts)) {
      lineItems = cartProducts.stripeProducts.map((item) => JSON.parse(item));
    } else {
      lineItems = [JSON.parse(cartProducts.stripeProducts)];
    }

    console.log(79,"lineItems - ",lineItems)
    
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












/* PayPal set up */
paypal.configure({
  mode: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
  client_id: process.env.VITE_PAYPAL_PUBLIC!,
  client_secret: process.env.VITE_PAYPAL_SECRET!,
});

app.post('/create-payment', (req: Request, res: Response) => {

  const cartProducts = req.query as { payPalProducts: string[] };
  console.log(121,"req.qurey - ",req.query)

  let payPalProducts: paypalProductType[];
  
  if (Array.isArray(cartProducts.payPalProducts)) {
    payPalProducts = cartProducts.payPalProducts.map((product) => JSON.parse(product));
  } else {
    payPalProducts = [JSON.parse(cartProducts.payPalProducts)];
  }

  const productsList = {
    items: payPalProducts.map((product) => ({
      name: product.name,
      sku: product.sku,
      price: product.price.toFixed(2),
      currency: 'USD',
      quantity: product.quantity,
    })),
  };
  console.log(141,"productsList - ",productsList)

  const total = payPalProducts.reduce((totalPrice, product) => totalPrice + product.price * product.quantity, 0);

const transactions = [
    {
      item_list: productsList,
      amount: {
        currency: 'USD',
        total: total.toString(),
      },
      description: 'Test description',
    },
  ];

  const create_payment_json = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal',
    },
    redirect_urls: {
      return_url: `${baseURL}/payment/?status=success`,
      cancel_url: `${baseURL}/payment/?status=canceled`,
    },
    transactions: transactions as paypal.Transaction[],
  };

  paypal.payment.create(create_payment_json as Payment, (error: any, payment: any) => {
    if (error) {
      if (error.response && error.response.details) {
        const validationErrors = error.response.details;

        console.error("Validation Error:");
        console.error(validationErrors);
      }
      console.error(error);
      throw error;
    } else {
      for (let i = 0; i < payment.links.length; i++) {
        if (payment.links[i].rel === 'approval_url') {
          res.redirect(303, payment.links[i].href.toString());
        }
      }
    }
  });
});







/* BTC pay setup */

app.post('/payment', async (req: Request, res: Response) => {
  try {
    // Replace with your BitPay API credentials
    const bitpayToken = process.env.BITPAY_TOKEN;
  
    // Create a BitPay invoice
    const response = await axios.post('https://api.bitpay.com/v1/invoices', {
      price: req.body.amount,
      currency: 'USD',
      token: bitpayToken,
    });
  
    // Get the payment invoice URL from the BitPay response
    const paymentUrl = response.data.data.url;
    res.json({ paymentUrl });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Payment failed' });
  }
});












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