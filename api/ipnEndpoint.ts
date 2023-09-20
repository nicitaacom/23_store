import { Request, Response } from 'express';
import axios from 'axios';

export default async function ipnEndpoint(req: Request, res: Response) {
  
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
}