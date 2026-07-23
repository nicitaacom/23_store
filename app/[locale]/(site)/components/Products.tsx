"use client"

import { memo } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { TProductDB } from "@/ts/product/TProductDB"
import { Product } from "."
import { useScopedI18n } from "@/locales/client"

interface ProductsProps {
  products: TProductDB[] | undefined
}

function Products({ products }: ProductsProps) {
  // output products with product.quantity that I take from user ? cart_products : anonymousCart.cartProducts
  // set individual quantity for each user in updatedProducts variable

  const t = useScopedI18n("product")
  const productsKey = products?.map(product => product.id).join("-") ?? "empty"

  return (
    <div
      className="w-full min-w-0 rounded mobile:border-[1px] broder-border-color">
      <div className="flex flex-row justify-between px-4">
        <h1 className="hidden tablet:flex text-lg">{t("products")}:</h1>
      </div>
      <AnimatePresence mode="wait">
        <motion.ul
          className="flex flex-col gap-y-8"
          key={productsKey}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={{
            hidden: {
              opacity: 0,
              y: 10,
            },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                staggerChildren: 0.07,
                delayChildren: 0.05,
              },
            },
            exit: {
              opacity: 0,
              y: -10,
              transition: {
                duration: 0.18,
                ease: [0.4, 0, 1, 1],
              },
            },
          }}>
          {products?.map(product => (
            <motion.li
              key={product.id}
              variants={{
                hidden: { opacity: 0, y: 18 },
                visible: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: -10 },
              }}
              transition={{
                duration: 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}>
              <Product {...product} />
            </motion.li>
          ))}
        </motion.ul>
      </AnimatePresence>
    </div>
  )
}
export default memo(Products)
