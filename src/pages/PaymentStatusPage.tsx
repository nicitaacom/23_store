import { useEffect } from "react"
import useUserCartStore from "../store/user/userCartStore"
import { Timer } from "../components/ui/Timer"
import { useLocation, useNavigate } from "react-router"
import { Resend } from 'resend';



export function PaymentStatusPage() {
  const userCartStore = useUserCartStore()
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const status = queryParams.get("status")
 const resend = new Resend('re_EfV7hTAs_JYPFXwDZGtunYNmJMLsDwnid');

  useEffect(() => {
    const sendEmail = async () => {
      if (status === "success") {
       try {
         resend.emails.send({
          from: 'onboarding@resend.dev',
          to: 'icpcsenondaryemail@gmail.com',
          subject: 'Hello World',
          html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
        })
        resend.domains.create({ name: 'http://localhost:8000' });

           } catch (error) {
             console.error('Failed to send email', error);
           }
      
      userCartStore.setCartQuantity0()
    }
    }
    sendEmail()
    //eslint-disable-next-line react-hooks/exhaustive-deps
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
            <p>Check snet to your email</p>
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
