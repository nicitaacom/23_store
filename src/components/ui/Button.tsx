"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import { VariantProps, cva } from "class-variance-authority"
import { twMerge } from "tailwind-merge"

const buttonVariants = cva(
  `flex items-center justify-center rounded-md hover:brightness-75 
  outline-none disabled:opacity-50 disabled:pointer-events-none transparent-colors duration-300`,
  {
    variants: {
      variant: {
        default: "px-4 py-2 bg-cta font-bold text-white",
        outline: "px-4 py-2 bg-transparent border-[1px] border-solid border-cta text-white hover:bg-cta",
        danger: "px-4 py-2 bg-danger font-bold text-white",
        "danger-outline": "px-4 py-2 bg-transpparent border-[1px] border-solid border-danger font-bold text-white",
        success: "px-4 py-2 bg-success font-bold text-white",
        "success-outline": "px-4 py-2 bg-transparent border-[1px] border-solid border-success font-bold text-white",
        "nav-link": `relative w-fit font-bold 
          before:absolute before:bottom-[-4px] before:w-full before:content-['']
           before:invisible before:opacity-0 before:translate-y-[0px]
           before:border-b-[3px] before:border-solid before:border-cta before:rounded-md before:transition-all
           before:duration-300 before:pointer-events-none`,
        link: "text-cta cursor-pointer",
        "continue-with": "p-4 w-full font-secondary text-secondary bg-cta flex justify-center items-center gap-x-4",
      },
      active: {
        active: "before:visible lalala before:opacity-100 before:translate-y-[2px]",
        inactive:
          "hover:before:visible hover:before:opacity-100 before:translate-y-[10px] hover:before:translate-y-[2px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  href?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, href, variant, active, ...props }, ref) => {
    if (href) {
      return (
        <Link to={href} className={twMerge(buttonVariants({ variant, active, className }))}>
          {children}
        </Link>
      )
    }
    return (
      <button className={twMerge(buttonVariants({ variant, active, className }))} ref={ref} {...props}>
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
