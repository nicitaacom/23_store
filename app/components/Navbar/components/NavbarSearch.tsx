import { BiSearchAlt } from "react-icons/bi"

import { redirect } from "next/navigation"
import { SearchInput } from "@/components/ui/Inputs/SearchInput"

async function searchProducts(formData: FormData) {
  "use server"

  const searchQuery = formData.get("searchQuery")?.toString()

  if (searchQuery === "") {
    redirect("/")
  }

  if (searchQuery) {
    redirect("/search?query=" + searchQuery)
  }
}

export function NavbarSearch({ children: Children }: { children: React.ReactNode }) {
  return (
    <form action={searchProducts}>
      <SearchInput
        className="hidden tablet:flex w-[40vw] max-w-[600px]"
        startIcon={<BiSearchAlt size={24} />}
        endIcon={Children}
        name="searchQuery"
        placeholder="Search..."
      />
    </form>
  )
}
