import { Switch } from ".."
import { HamburgerMenu, Logo } from "./components"
import NavbarWrapper from "./components/NavbarWrapper"

export default function Navbar() {
  return (
    <NavbarWrapper>
      <div className="flex flex-row gap-x-4 items-center">
        {/* HAMBURGER-ICON */}
        <HamburgerMenu />

        <Logo />

        <Switch />
      </div>
    </NavbarWrapper>
  )
}
