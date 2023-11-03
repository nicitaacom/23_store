interface DeleteProductHeaderProps {
  title: string
  subTitle: string
  onStock: number
  price: number
}

export function DeleteProductHeader({ title, subTitle, onStock, price }: DeleteProductHeaderProps) {
  return (
    <section className="flex flex-col">
      <div className="flex flex-col tablet:flex-row gap-y-4 items-center tablet:items-start tablet:justify-between">
        <p className="hidden tablet:flex flex-row">
          Title:&nbsp;<h2>{title}</h2>
        </p>
        <p className="hidden tablet:block">Price:&nbsp;{price}</p>
      </div>
      <p className="flex flex-row">
        Description:&nbsp;<h2>{subTitle}</h2>
      </p>
      <p className="flex flex-row">
        On stock:&nbsp;<h2>{onStock}</h2>
      </p>
    </section>
  )
}
