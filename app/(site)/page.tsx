import { Products } from "./components"

function Home() {
  return (
    <div className="text-2xl text-white flex flex-col gap-y-8 justify-between items-center py-12">
      <section className="flex flex-col gap-y-4">
        <Products />
      </section>
    </div>
  )
}

export default Home
