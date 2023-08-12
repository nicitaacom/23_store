/* react */
import { Route, Routes } from "react-router-dom"
/* components */

/* sections */
import { HomePage, Login, Register } from "./pages"
import { Navbar } from "./components/Navbar/Navbar"
import { AdminModal } from "./components/ui/Modals/AdminModal"
import { useModalsStore } from "./store/useModals"

function App() {

  const { isOpen, onClose } = useModalsStore()

  const closeModal = (id: number) => {
    onClose(id)
  }

  return (
    <div className="text-white">
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
