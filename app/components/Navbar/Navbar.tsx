import { Switch } from ".."
import { HamburgerMenu, Logo, NavbarSearch } from "./components"
import NavbarWrapper from "./components/NavbarWrapper"

export default function Navbar() {
  return (
    <NavbarWrapper>
      <div className="flex flex-row gap-x-4 items-center">
        {/* HAMBURGER-ICON */}
        <HamburgerMenu />

        <Logo />

        <Switch />

        <div className="flex flex-row gap-x-2">
          <NavbarSearch/>
        </div>
      </div>
    </NavbarWrapper>
  )
}
