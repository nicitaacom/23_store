import { useEffect } from "react"
import useUserCartStore from "../store/user/userCartStore"
import { Timer } from "../components/ui/Timer"
import { useLocation, useNavigate } from "react-router"
import useUserStore from "../store/user/userStore"

export function PaymentStatusPage() {
  const userCartStore = useUserCartStore()
  const userStore = useUserStore()
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const status = queryParams.get("status")

  useEffect(() => {
    if (status === "success") {
      
      
      userCartStore.setCartQuantity0()
    }
  }, [])

  return (
    <section
      className="absolute left-[50%] top-[50%] translate-x-[-50%]
     translate-y-[-100%] tablet:translate-y-[-75%] laptop:translate-y-[-50%] 
    flex flex-col text-center justify-center items-center w-full">
      {status === "success" ? (
        <>
          <img src="/success-checkmark.gif" alt="Success Checkmark" />
          <h1 className="text-2xl mb-2">Your payment is successful</h1>
          <p className="flex flex-row">
            Redirecting to home page in <Timer seconds={5} action={() => navigate("/", { replace: true })} />
          </p>
        </>
      ) : (
        <>
          <img src="/error-checkmark.gif" alt="Error Checkmark" />
          <h1 className="text-2xl mb-2">Your payment was canceled</h1>
          <p className="flex flex-row">
            Redirecting to home page in <Timer seconds={5} action={() => navigate("/", { replace: true })} />
          </p>
        </>
      )}
    </section>
  )
}
