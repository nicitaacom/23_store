export function formatDeliveryDate() {
  const deliveryDate = new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000) // Add 3 days from current date

  if (deliveryDate.getDay() === 6) {
    deliveryDate.setDate(deliveryDate.getDate() + 1) // Add 1 more day to skip Saturday
  }

  const day = String(deliveryDate.getDate()).padStart(2, "0")
  const month = String(deliveryDate.getMonth() + 1).padStart(2, "0")
  const year = deliveryDate.getFullYear()

  //return day in format 24.12.2022
  const formattedDeliveryDate = `${day}.${month}.${year}`
  return formattedDeliveryDate
}
