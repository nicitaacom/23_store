import type { User } from "@supabase/supabase-js"
import { BiSearchAlt } from "react-icons/bi"

import { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { AvatarDropdown, CartIcon, HamburgerMenu, Logo, OpenAuthModalButton } from "./components"
import { ContactButton } from "./components/ContactButton"
import { NavbarWrapper } from "./components/NavbarWrapper"
import { LanguageDropdown } from "@/components/LanguageDropdown"
import { SwitchDarkMode } from "@/components"

interface NavbarViewProps {
  avatarUrl?: string
  cartQuantity: number
  locale?: TLocaleTag
  roles: string[]
  user: User | null
}

export function NavbarView({ avatarUrl, cartQuantity, locale, roles, user }: NavbarViewProps) {
  return (
    <NavbarWrapper>
      <div className="flex flex-row items-center gap-x-4">
        <HamburgerMenu />
        <Logo />
      </div>
      <div className="flex flex-row items-center gap-x-2">
        <LanguageDropdown className="hidden tablet:flex" locale={locale} />
        <SwitchDarkMode className="max-[500px]:hidden" />
        <BiSearchAlt className="flex tablet:hidden" size={28} />
        <CartIcon userId={user?.id} cart_quantity={cartQuantity} />
        <ContactButton />
        {user ? <AvatarDropdown roles={roles} avatarUrlServer={avatarUrl} /> : <OpenAuthModalButton />}
      </div>
    </NavbarWrapper>
  )
}
