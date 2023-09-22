import { stripeProductType } from "./src/interfaces/stripeProduct";
import { paypalProductType } from "./src/interfaces/paypalProduct";

import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import paypal, { Payment } from 'paypal-rest-sdk';
import cors from 'cors'
import axios from 'axios'
import { Resend } from 'resend'
import dotenv from 'dotenv'
dotenv.config();

const baseURL = process.env.NODE_ENV === 'production' ? 'https://23-store.vercel.app' : 'http://localhost:8000';
const baseBackendURL = process.env.NODE_ENV === 'production' ? 'https://23-store.vercel.app' : 'http://localhost:3000';







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
const stripe = new Stripe(process.env.REACT_STRIPE_SECRET!, {
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
  client_id: process.env.REACT_PAYPAL_PUBLIC!,
  client_secret: process.env.REACT_PAYPAL_SECRET!,
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
      return_url: `${baseBackendURL}/ipn-endpoint`,
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


app.get('/ipn-endpoint', (req: Request, res: Response) => {
  const paymentId = req.query.paymentId as string;
  const token = req.query.token as string;
  const payerId = req.query.PayerID as string;

  const paypalApiEndpoint = process.env.NODE_ENV === 'production' 
    ? 'https://api.paypal.com/v1' 
    : 'https://api.sandbox.paypal.com/v1';

  const getPaymentUrl = `${paypalApiEndpoint}/payments/payment/${paymentId}`;

  const config = {
    headers: {
      Authorization: `Bearer ${process.env.REACT_PAYPAL_SECRET}`,
      'Content-Type': 'application/json'
    }
  };

  console.log("---------------------------------- ")
  console.log(205,"payerId - ",payerId)
  console.log("---------------------------------- ")
  console.log(204,"process.env.REACT_PAYPAL_SECRET - ",process.env.REACT_PAYPAL_SECRET)
  console.log("---------------------------------- ")
  console.log(206,"getPaymentUrl - ",getPaymentUrl)
  console.log("---------------------------------- ")
  console.log(207,"config - ",config)
  console.log("---------------------------------- ")
  

  axios.get(getPaymentUrl, config)
    .then(response => {
      const paymentData = response.data;
      const email = paymentData.payer.payer_info.email;
      const shippingAddress = paymentData.payer.payer_info.shipping_address;

      console.log("Email:", email);
      console.log("Shipping Address:", shippingAddress);

      console.log("token:", token);
      console.log("payerId:", payerId);

      // Process the email and shipping address as needed

      res.sendStatus(200);
    })
    .catch(error => {
      console.error(error);
      res.sendStatus(500);
    });
});














/* email set up */

const resend = new Resend(process.env.REACT_RESEND_PUBLIC);

app.post('/send-email',  async (req: Request, res: Response) => {
  try {
    const { from, to, subject, html } = req.body;

    await resend.emails.send({
      from:from,
      to:to,
      subject:subject,
      html:html,
    })
     res.sendStatus(200);

  } catch (error) {
    console.error(error);
     res.sendStatus(500);
  }
})














/* Coinmarketcap set up */
app.get('/coinmarketcap', async (req: Request, res: Response) => {
  try {
    const { amount, symbol, convert } = req.query;

    const response = await axios.get(
      `https://pro-api.coinmarketcap.com/v2/tools/price-conversion?amount=${amount}&symbol=${symbol}&convert=${convert}&CMC_PRO_API_KEY=${process.env.REACT_COINMARKETCAP_SECRET}`
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.log('Error -', error);
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});