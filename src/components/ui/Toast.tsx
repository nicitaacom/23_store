import { AiOutlineCheckCircle } from "react-icons/ai"
import { BiErrorCircle } from "react-icons/bi"
import { motion } from "framer-motion"

import useToast from "../../store/ui/useToast"
import { Button } from "."

export function Toast() {
  const { error, success, subTitle, title } = useToast()

  return (
    <motion.div
      className={`fixed right-[1%] bottom-[2%] border-[1px] ${success ? "border-success" : "border-danger"}
      bg-foreground flex gap-x-4 w-auto max-w-[30%] rounded-lg px-4 py-2 z-[101]`}
      initial={{ y: 200 }}
      animate={{ y: 0 }}
      exit={{ y: 200 }}>
      <div className="flex items-center">
        {success ? (
          <AiOutlineCheckCircle className="text-success" size={32} />
        ) : (
          <BiErrorCircle className="text-danger" size={32} />
        )}
      </div>
      <div className="flex flex-col w-full">
        <h1 className={`text-title font-bold`}>{title ? title : success ? "Success" : "Error"}</h1>
        <p className="text-subTitle">
          {subTitle ? (
            subTitle
          ) : error ? (
            <p>
              Unknown error please contact -&nbsp;
             <Button className="text-info" href="t.me/nicitaacom">
                Admin
              </Button>
            </p>
          ) : (
            <p>Just success</p>
          )}
        </p>
      </div>
    </motion.div>
  )
}
