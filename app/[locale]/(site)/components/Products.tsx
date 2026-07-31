"use client"

import { memo } from "react"
import { motion } from "framer-motion"

import { TProductDB } from "@/ts/product/TProductDB"
import { Product } from "."
import { PersonalizeModal } from "@/components/ui/Modals/PersonalizeModal/PersonalizeModal"

interface ProductsProps {
  products: TProductDB[] | undefined
}

function Products({ products }: ProductsProps) {
  // output products with product.quantity that I take from user ? cart_products : anonymousCart.cartProducts
  // set individual quantity for each user in updatedProducts variable

  return (
    <div className="w-full min-w-0 rounded mobile:border-[1px] broder-border-color">
      <motion.ul
        className="flex flex-col gap-y-8"
        initial={false}
        animate="visible"
        variants={{
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              staggerChildren: 0.07,
            },
          },
        }}>
        {products?.map(product => (
          <motion.li
            key={product.id}
            layout="position"
            variants={{ visible: { opacity: 1, y: 0 } }}
            transition={{
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}>
            <Product {...product} />
          </motion.li>
        ))}
      </motion.ul>

      {/* One modal for the whole list - it reads which product to show from ?productId= */}
      <PersonalizeModal products={products ?? []} />
    </div>
  )
}
export default memo(Products)
