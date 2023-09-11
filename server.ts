import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import cors from 'cors'
dotenv.config();



export interface IProduct {
  id: string
  title: string
  sub_title: string
  price: number
  img_url: string[]
  on_stock: number
  quantity: number
}




const baseURL = process.env.NODE_ENV === 'production' ? 'https://23-store.vercel.app' : 'http://localhost:8000';

//I'm sure that stripe requires my items in cart (not only all store items)



const app = express();
app.use(cors({origin:'http://localhost:8000'}))
app.use(express.json());
const stripe = new Stripe(process.env.VITE_STRIPE_SECRET!, {
  apiVersion: '2023-08-16',
});
app.use(express.static('public'));
 const port = 3000;
 app.listen(port, () => {
     console.log(`Server is running on port ${port}`);
   });

app.get('/', (_req: Request, res: Response) => {
  res.send('Server running on port 3000'); // Or any other response you want to send for the root route
});









app.post('/create-checkout-session', async (req: Request, res: Response) => {
 try {
   const cartProducts = req.query as { lineItems: string[] };
    const lineItems = cartProducts.lineItems.map((item) => JSON.parse(item));
   
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





