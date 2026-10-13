import Stripe from "stripe"

function getTestStripe(environment) {
  const stripeKey = environment.NEXT_STRIPE_SECRET_KEY
  if (!stripeKey?.startsWith("sk_test_")) {
    throw new Error("Stripe resource readback requires a TEST key")
  }
  return new Stripe(stripeKey, { maxNetworkRetries: 0, timeout: 15000 })
}

export async function verifyStripeTestProduct(environment, input) {
  if (!input?.productId || !input?.priceId || !input?.ownerId) {
    throw new Error("Stripe readback requires exact product, price, and owner ids")
  }
  const stripe = getTestStripe(environment)
  const [product, price] = await Promise.all([
    stripe.products.retrieve(input.productId),
    stripe.prices.retrieve(input.priceId),
  ])

  if (product.livemode || price.livemode) throw new Error("Stripe returned a live-mode E2E resource")
  if (!product.active || !price.active) throw new Error("New Stripe TEST resources are unexpectedly inactive")
  if (product.id !== price.product || product.id !== input.productId) {
    throw new Error("Stripe TEST price does not belong to the created product")
  }
  if (product.metadata.storage_owner_id !== input.ownerId) {
    throw new Error("Stripe TEST product owner metadata differs from the run-owned account")
  }
  if (input.amountCents !== undefined && price.unit_amount !== input.amountCents) {
    throw new Error("Stripe TEST price amount differs from the selected variant price")
  }
  if (input.imageUrl && !product.images.includes(input.imageUrl)) {
    throw new Error("The uploaded product image was not written to its Stripe TEST product")
  }
  if (input.name !== undefined && product.name !== input.name) {
    throw new Error("Stripe TEST product name differs from the saved product title")
  }
  if (input.description !== undefined && product.description !== input.description) {
    throw new Error("Stripe TEST product description differs from the saved product description")
  }

  return {
    product: { id: product.id, active: product.active, livemode: product.livemode, name: product.name, description: product.description, images: product.images },
    price: { id: price.id, product: price.product, active: price.active, livemode: price.livemode, unitAmount: price.unit_amount },
    verificationReference: `stripe:${product.id}:${price.id}:livemode-false:active`,
  }
}

export async function verifyStripeTestCheckoutSession(environment, input) {
  if (typeof input?.sessionId !== "string" || !/^cs_test_[A-Za-z0-9]+$/.test(input.sessionId)
    || !Number.isSafeInteger(input?.amountCents) || input.amountCents <= 0 || !input?.customerEmail) {
    throw new Error("Stripe Checkout readback requires one TEST session, amount, and run-owned email")
  }
  const stripe = getTestStripe(environment)
  const session = await stripe.checkout.sessions.retrieve(input.sessionId)
  if (session.id !== input.sessionId || session.livemode || session.mode !== "payment") {
    throw new Error("Stripe Checkout session identity, mode, or TEST environment differs")
  }
  if (session.status !== "open" || session.payment_status !== "unpaid") {
    throw new Error("New Stripe TEST Checkout session is not open and unpaid")
  }
  if (session.currency !== "usd" || session.amount_total !== input.amountCents) {
    throw new Error("Stripe TEST Checkout session total differs from the submitted items")
  }
  if (input.paymentMethodType && !session.payment_method_types.includes(input.paymentMethodType)) {
    throw new Error(`Stripe TEST Checkout session does not include ${input.paymentMethodType}`)
  }
  let customerEmail = session.customer_email
  if (!customerEmail && session.customer) {
    const customerId = typeof session.customer === "string" ? session.customer : session.customer.id
    const customer = await stripe.customers.retrieve(customerId)
    if (!("deleted" in customer) || !customer.deleted) customerEmail = customer.email
  }
  if (customerEmail !== input.customerEmail) {
    throw new Error("Stripe TEST Checkout customer email differs from the run-owned account")
  }
  if (!session.url?.startsWith("https://checkout.stripe.com/")) {
    throw new Error("Stripe TEST Checkout session did not return its hosted payment page")
  }
  return {
    sessionId: session.id,
    customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
    status: session.status,
    paymentStatus: session.payment_status,
    amountCents: session.amount_total,
    currency: session.currency,
    paymentMethodTypes: session.payment_method_types,
    urlHost: new URL(session.url).host,
    verificationReference: `stripe-checkout:${session.id}:livemode-false:open:unpaid:${session.amount_total}-usd`,
  }
}

export async function cleanupStripeTestCheckoutSession(environment, input) {
  if (typeof input?.sessionId !== "string" || !/^cs_test_[A-Za-z0-9]+$/.test(input.sessionId)) {
    throw new Error("Stripe Checkout cleanup requires one exact TEST session id")
  }
  const stripe = getTestStripe(environment)
  let session = await stripe.checkout.sessions.retrieve(input.sessionId)
  if (session.livemode || session.payment_status === "paid") {
    throw new Error("Stripe Checkout cleanup refuses a live or paid session")
  }
  if (session.status === "open") {
    await stripe.checkout.sessions.expire(session.id)
    session = await stripe.checkout.sessions.retrieve(session.id)
  }
  if (session.status !== "expired" || session.payment_status !== "unpaid") {
    throw new Error("Stripe TEST Checkout session was not verified expired and unpaid")
  }

  let customerReference = "no-customer"
  if (session.customer && input.expectedCustomerEmail) {
    const customerId = typeof session.customer === "string" ? session.customer : session.customer.id
    const customer = await stripe.customers.retrieve(customerId)
    if ("deleted" in customer && customer.deleted) {
      customerReference = `customer-already-absent:${customerId}`
    } else {
      if (customer.livemode || customer.email !== input.expectedCustomerEmail) {
        throw new Error("Stripe TEST Checkout customer differs from the run-owned email; cleanup refused")
      }
      await stripe.customers.del(customerId)
      const deletedCustomer = await stripe.customers.retrieve(customerId)
      if (!("deleted" in deletedCustomer) || !deletedCustomer.deleted) {
        throw new Error("Stripe Checkout test customer is still present after cleanup")
      }
      customerReference = `customer-deleted:${customerId}`
    }
  }

  return `stripe-checkout:${session.id}:livemode-false:expired:unpaid:${customerReference}`
}

export async function verifyStripeResourcesInactive(environment, input) {
  if (!input?.productId || !input?.priceId) {
    throw new Error("Stripe cleanup readback requires exact product and price ids")
  }
  const stripe = getTestStripe(environment)
  const [product, price] = await Promise.all([
    stripe.products.retrieve(input.productId),
    stripe.prices.retrieve(input.priceId),
  ])
  if (product.livemode || price.livemode) throw new Error("Stripe cleanup found a live-mode resource")
  if (product.active || price.active) throw new Error("Stripe TEST product or price is still active after deletion")
  return `stripe:${product.id}:${price.id}:livemode-false:inactive`
}

export async function verifyStripePriceInactive(environment, priceId) {
  if (typeof priceId !== "string" || !priceId) throw new Error("Stripe price readback requires one exact price id")
  const stripe = getTestStripe(environment)
  const price = await stripe.prices.retrieve(priceId)
  if (price.livemode) throw new Error("Stripe cleanup found a live-mode price")
  if (price.active) throw new Error("The replaced Stripe TEST price is still active")
  return `stripe-price:${price.id}:livemode-false:inactive`
}
