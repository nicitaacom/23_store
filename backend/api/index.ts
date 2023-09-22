import { Request, Response } from 'express';

export default async function endpoint(_req: Request, res: Response) {

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
}