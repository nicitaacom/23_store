import "./globals.css"

import type { Metadata } from "next"

import { Layout } from "./components"



export const metadata: Metadata = {
  title: "23 store",
  description: "Something better than amazon",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {


  return (
    <html lang="en">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  )
}
