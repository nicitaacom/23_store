import Image from "next/image"

export default function EmptyCart() {
  return (
    <div className="flex flex-col justify-center items-center">
      <Image src="/empty-cart.png" alt="" width={256} height={256} />
      <h1 className="text-4xl">Cart is empty</h1>
    </div>
  )
}
