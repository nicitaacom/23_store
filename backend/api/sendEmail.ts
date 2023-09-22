import { Request, Response } from 'express';
import { Resend } from 'resend'

export default async function sendEmail(req: Request, res: Response) {
 
/* email set up */

const resend = new Resend(process.env.REACT_RESEND_PUBLIC);
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
}