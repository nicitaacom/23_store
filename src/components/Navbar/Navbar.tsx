"use client"

import { useLocation, useNavigate } from "react-router-dom"

import { AnimatePresence, motion } from "framer-motion"
import { BiLogIn, BiLogOut } from "react-icons/bi"
import { AiOutlineHome, AiOutlineUserAdd } from "react-icons/ai"
import { BsWindow } from 'react-icons/bs'
import { HiSwitchHorizontal } from 'react-icons/hi'

import useHamburgerMenu from "../../store/useHamburgerMenu"
import { Button } from "../ui/Button"
import { DropdownContainer } from "./DropdownContainer"
import { DropdownItem } from "./DropdownItem"
import useGetProfilePictureUrl from "../../hooks/useGetProfilePicture"
import { useModalsStore } from "../../store/useModals"
import supabase from "../../utils/supabaseClient"
import useAuthorized from "../../hooks/useAuthorized"

export function Navbar() {

  const { onOpen } = useModalsStore()

  const openModal = (id: number) => {
    onOpen(id)
  }

  const { profilePictureUrl } = useGetProfilePictureUrl()

  const navLinks = [
    {
      label: "Home",
      href: "/",
      visibleFor: 'all',
    },
    {
      label: "Login",
      href: "/login",
      visibleFor: '!user',
    },
    {
      label: "Register",
      href: "/register",
      visibleFor: '!user',
    },
    {
      label: "Cart",
      href: "/cart",
      visibleFor: 'user',
    },
  ]

  const hamburgerMenu = useHamburgerMenu()

  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuthorized()



  return (
    <nav className="flex items-center justify-between px-4 py-2 tablet:px-6 laptop:px-8">
      {/* LOGO */}
      <h1 className="text-5xl font-bold text-gray-300">Logo</h1>

      {/* Nav-links */}
      <ul className="hidden items-center justify-between gap-x-4 tablet:flex">
        {navLinks.map(navLink => (
          <li key={navLink.href}>
            <Button className={navLink.visibleFor === 'user' ? isAuthenticated ? 'flex' : 'hidden'
              : navLink.visibleFor === '!user' ? !isAuthenticated ? 'flex' : 'hidden'
                : 'flex'}
              href={navLink.href}
              variant="nav-link"
              active={location.pathname === navLink.href ? "active" : "inactive"}>
              {navLink.label}
            </Button>
          </li>
        ))}
      </ul>

      {/* HAMBURDER-ICON */}
      <DropdownContainer
        className="top-[47.5px] w-[200px]"
        icon={
          <img className="h-[32px] w-[32px] rounded-full"
            src={profilePictureUrl ? profilePictureUrl : "/placeholder.jpg"}
            width={32}
            height={32}
            alt="profile_picture_url"
          />
        }>
        <DropdownItem icon={AiOutlineHome} label="Home" onClick={() => navigate('/', { replace: true })} />
        {isAuthenticated && <DropdownItem icon={BsWindow} label="Admin panel" onClick={() => openModal(1)} />}
        {!isAuthenticated && <DropdownItem icon={BiLogIn} label="Login" onClick={() => navigate('/login', { replace: true })} />}
        {!isAuthenticated && <DropdownItem icon={AiOutlineUserAdd} label="Register" onClick={() => navigate('/register', { replace: true })} />}
        {isAuthenticated && <DropdownItem icon={HiSwitchHorizontal} label="Switch account" onClick={() => navigate('/switch-account', { replace: true })} />}
        {isAuthenticated && <DropdownItem icon={BiLogOut} label="Logout" onClick={() => supabase.auth.signOut()} />}
      </DropdownContainer>

      {/* HAMBURDER-MENU */}
      <AnimatePresence>
        {hamburgerMenu.isOpen && (
          <motion.div
            initial={{ opacity: -1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: -1 }}
            className="fixed inset-[0] z-[99] bg-[rgba(0,0,0,0.2)]"
            onClick={hamburgerMenu.onClose}>
            <motion.div
              className="absolute left-1/2 z-[100]"
              initial={{ y: "-150%", x: "-50%", opacity: -1 }}
              animate={{ y: "150%", x: "-50%", opacity: 1 }}
              exit={{ y: "-150%", x: "-50%", opacity: -1 }}
              transition={{ ease: "circOut", duration: 0.3 }}>
              <ul className="flex flex-col items-center justify-between gap-y-4 px-8 py-4">
                {navLinks.map(navLink => (
                  <li key={navLink.href}>
                    <Button
                      href={navLink.href}
                      variant="nav-link"
                      active={location.pathname === navLink.href ? "active" : "inactive"}>
                      {navLink.label}
                    </Button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
