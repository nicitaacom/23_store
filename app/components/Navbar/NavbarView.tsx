import type { User } from "@supabase/supabase-js"

import { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { AvatarDropdown, CartIcon, HamburgerMenu, Logo, MobileSearchButton, OpenAuthModalButton } from "./components"
import { ContactButton } from "./components/ContactButton"
import { NavbarWrapper } from "./components/NavbarWrapper"
import { DarkModeRadioButton } from "@/components"
import { LanguageDropdown } from "@/components/LanguageDropdown"

interface NavbarViewProps {
  avatarUrl?: string
  cartQuantity: number
  darkModeLabel: string
  locale?: TLocaleTag
  roles: string[]
  user: User | null
}

// http://localhost:6006/?path=/story/navigation-navbar--anonymous
export function NavbarView({ avatarUrl, cartQuantity, darkModeLabel, locale, roles, user }: NavbarViewProps) {
  return (
    <NavbarWrapper>
      <div className="flex flex-row items-center gap-x-4">
        <HamburgerMenu />
        <Logo />
      </div>
      <div className="flex flex-row items-center gap-x-2">
        <LanguageDropdown className="hidden tablet:flex" locale={locale} />
        <DarkModeRadioButton className="max-[500px]:hidden" ariaLabel={darkModeLabel} />
        <MobileSearchButton />
        <CartIcon userId={user?.id} cart_quantity={cartQuantity} />
        <ContactButton />
        {user ? <AvatarDropdown roles={roles} avatarUrlServer={avatarUrl} /> : <OpenAuthModalButton />}
      </div>
    </NavbarWrapper>
  )
}
