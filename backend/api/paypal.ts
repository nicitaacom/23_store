import { Request, Response } from 'express';
import { paypalProductType } from "../src/interfaces/paypalProduct";
import paypal, { Payment } from 'paypal-rest-sdk';
import { baseURL } from '../src/utils/baseURL';
import { baseBackendURL } from '../src/utils/baseURL';


export default async function paypalEndpoint(req: Request, res: Response) {
 
/* PayPal set up */
paypal.configure({
  mode: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
  client_id: process.env.REACT_PAYPAL_PUBLIC!,
  client_secret: process.env.REACT_PAYPAL_SECRET!,
});


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
}