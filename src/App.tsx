/* react */
import { Route, Routes } from "react-router-dom"
/* components */

/* sections */
import { HomePage, Login, Register } from "./pages"
import { Navbar } from "./components/Navbar/Navbar"
import { AdminModal } from "./components/ui/Modals/AdminModal"
import { useModalsStore } from "./store/useModals"
import useDarkMode from "./store/darkModeStore"
import { useEffect } from "react"

function App() {

  const { isOpen, onClose } = useModalsStore()

  const closeModal = (id: number) => {
    onClose(id)
  }

  const darkMode = useDarkMode()

  useEffect(() => {
    if (darkMode.isDarkMode) {
      document.getElementsByTagName('html')[0].classList.remove('light')
      document.getElementsByTagName('html')[0].classList.add('dark')
    }
    else {
      document.getElementsByTagName('html')[0].classList.remove('dark')
      document.getElementsByTagName('html')[0].classList.add('light')
    }
  }, [darkMode])

  return (
    <div className="bg-background text-title
    min-h-screen transition-colors duration-300">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      <AdminModal isOpen={isOpen[1]} onClose={() => closeModal(1)} label="Admin panel" />
    </div>
  )
}

export default App
