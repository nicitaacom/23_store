import useAnonymousCartStore from "@/store/user/cartStore"

export function getAnonymousCart() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const anonymousCart = useAnonymousCartStore()
  return anonymousCart.cartProducts
}
