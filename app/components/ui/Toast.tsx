import { AiOutlineCheckCircle } from "react-icons/ai"
import { BiErrorCircle } from "react-icons/bi"
import { motion } from "framer-motion"

import useToast from "@/store/ui/useToast"
import { Button } from "."

export function Toast() {
  const { error, success, subTitle, title } = useToast()

  return (
    <motion.div
      className={`fixed right-[2%] bottom-[2%] border-[1px] ${success ? "border-success" : "border-danger"}
      bg-foreground flex gap-x-4 w-auto max-w-[30%] rounded-lg px-4 py-2 z-[4999]`}
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
        <div className={`text-title font-bold`}>
          <h1 className="whitespace-pre-wrap">{title ? title : success ? "Success" : "Error"}</h1>
        </div>
        <div className="text-subTitle whitespace-pre-wrap">
          {subTitle ? (
            subTitle
          ) : error ? (
            <p className="flex flex-wrap">
              Unknown error please contact -&nbsp;
              <Button className="inline-block text-info" variant="link" href="t.me/nicitaacom">
                Admin
              </Button>
            </p>
          ) : (
            <p>Just success</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
