import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Layout } from "./components/Layout"
import { Navbar } from "./components/Navbar/Navbar"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '23 store',
  description: 'Something better than amazon',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar/>
        <Layout>
         {children} 
        </Layout>
      </body>
    </html>
  )
}
