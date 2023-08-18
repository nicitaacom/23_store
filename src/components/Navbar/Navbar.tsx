import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { AiOutlineMenu } from 'react-icons/ai'
import { BiSearchAlt, BiUserCircle } from 'react-icons/bi'
import { LuShoppingCart } from 'react-icons/lu'
import { FiPhoneCall } from 'react-icons/fi'

import useDarkMode from "../../store/darkModeStore"
import { Input } from "../ui/Input"
import { Language } from "./Language"
import { Switch } from "../ui/Switch"
import supabase from "../../utils/supabaseClient"
import useGetUserId from "../../hooks/useGetUserId"
import { ProductsSkeleton } from "../ui/Skeletons/ProductsSkeleton"
import useUserCartStore from "../../store/userCartStore"


export function Navbar() {

  const navigate = useNavigate()
  const { userId } = useGetUserId()
  const darkMode = useDarkMode()
  const userCartStore = useUserCartStore()


  const [search, setSearch] = useState('')
  const [cartQuantity, setCartQuantity] = useState<number>(0);
  //if user load cartQuantity from db else from store


  useEffect(() => {
    async function getCartQuantity() {
      try {
        const { data: cartQuantityResponse } = await supabase
          .from("users_cart")
          .select("cart_quantity")
          .eq("id", userId);
        if (cartQuantityResponse) {
          setCartQuantity(cartQuantityResponse[0].cart_quantity);
        }
      } catch (error) {
        console.error("fetchCartQuantity - ", error);
      }
    }
    getCartQuantity()
  }, [userId])

  if (cartQuantity === null) {
    return <ProductsSkeleton />
  }


  return (
    <nav className="flex flex-row justify-between items-center 
    px-4 tablet:px-6 laptop:px-8 py-2 max-w-[1600px] max-h-[64px] mx-auto">

      <div className="flex flex-row gap-x-2 items-center">
        {/* HAMBURGER-ICON */}
      <AiOutlineMenu className='flex  cursor-pointer' onClick={() => { /* open slidebar */ }} size={28} />

      {/* LOGO */}
      <h1 className="hidden laptop:flex cursor-pointer uppercase text-4xl" onClick={() => navigate('/', { replace: true })} >
        Store
      </h1>
      </div>

      <div className="flex flex-row gap-x-2">
        {/* SEARCH */}
        <Input startIcon={<BiSearchAlt size={24} />} className="hidden tablet:flex w-[40vw] max-w-[600px]" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search..." />

        {/* LANGUAGE */}
        <Language className="hidden tablet:flex" />
      </div>

      {/* ICONS-HELP */}
      <div className="flex flex-row gap-x-2 items-center ">
        <BiUserCircle className='cursor-pointer text-title hover:brightness-75 transition-all duration-300' size={28} />

        <div className={`mr-2 cursor-pointer text-title hover:brightness-75 transition-all duration-300
        before:absolute before:w-[20px] before:h-[20px] before:bg-brand before:rounded-full before:text-title-foreground
        before:translate-x-[80%] before:translate-y-[-20%] ${userId ? cartQuantity === 0 ? 'hidden' : 'flex' : userCartStore.cartQuantity}
        `}>
          <LuShoppingCart className='cursor-pointer' size={28} />
          <div className={`absolute min-w-[20px] translate-x-[80%] translate-y-[-175%] laptop:translate-y-[-155%] text-center text-title-foreground 
          text-[12px] laptop:text-[14px]
          ${userId ? cartQuantity === 0 ? 'hidden' : 'flex' : userCartStore.cartQuantity}`}>
            {userId ? cartQuantity : userCartStore.cartQuantity}
            </div>
        </div>
        
        <FiPhoneCall className='cursor-pointer text-icon-color hover:brightness-75 transition-all duration-300' size={28} />
        <Switch isChecked={darkMode.isDarkMode} onChange={darkMode.toggleDarkMode} />
      </div>
    </nav>
  )
}