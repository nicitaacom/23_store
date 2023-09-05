/* react */
import { useEffect } from "react"
import { Route, Routes } from "react-router-dom"
/* components */

/* sections */
import useDarkMode from "./store/ui/darkModeStore"
import { HomePage, Login, Register } from "./pages"
import { Navbar } from "./components/Navbar/Navbar"
import { AdminModal, AuthModal } from "./components/ui/Modals"
import { useModals } from "./store/ui/useModals"

function App() {

  const darkMode = useDarkMode()

  useEffect(() => {
    if (darkMode.isDarkMode) {
      document.getElementsByTagName("html")[0].classList.remove("light")
      document.getElementsByTagName("html")[0].classList.add("dark")
    } else {
      document.getElementsByTagName("html")[0].classList.remove("dark")
      document.getElementsByTagName("html")[0].classList.add("light")
    }
  }, [darkMode])
    
  
  const { isOpen, closeModal } = useModals()
//git

  return (
    <div
      className="bg-background text-title
    min-h-screen transition-colors duration-300">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      <AdminModal isOpen={isOpen["AdminModal"]} onClose={() => closeModal("AdminModal")} label="Admin panel" />
      <AuthModal isOpen={isOpen["AuthModal"]} onClose={() => closeModal("AuthModal")} label="Auth" />
    </div>
  )
}

export default App
