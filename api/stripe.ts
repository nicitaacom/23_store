import { Request, Response } from 'express';
import Stripe from 'stripe';
import { baseURL } from '../src/utils/baseURL';
import { stripeProductType } from "../src/interfaces/stripeProduct";

export default async function stripeEndpoint(req: Request, res: Response) {
 
/* stripe set up */
const stripe = new Stripe(process.env.REACT_STRIPE_SECRET!, {
  apiVersion: '2023-08-16',
});

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
 
}