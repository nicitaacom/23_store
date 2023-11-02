interface OwnerProductHeaderProps {
  title: string
  price: number
  onStock: number
}

export function OwnerProductHeader({ title, price, onStock }: OwnerProductHeaderProps) {
  return (
    <section className="flex flex-col">
      <div className="flex flex-row gap-x-2 justify-between">
        <h2 className={`${onStock === 0 ? "line-clamp-1" : "line-clamp-2"}`}>{title}</h2>
        <h2>{price}</h2>
      </div>
      <p>On stock:{onStock}</p>
    </section>
  )
}
