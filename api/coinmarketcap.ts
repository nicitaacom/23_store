import { Request, Response } from 'express';
import axios from 'axios';

export default async function coinmarketcapEndpoint(req: Request, res: Response) {
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
}