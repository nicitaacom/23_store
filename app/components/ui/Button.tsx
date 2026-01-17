"use client"

import * as React from "react"
import Link from "next/link"
import { VariantProps, cva } from "class-variance-authority"
import { twMerge } from "tailwind-merge"
import { motion, HTMLMotionProps } from "framer-motion"

const buttonVariants = cva(
  `inline-flex items-center justify-center font-medium outline-none
  transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none
  focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background
  active:scale-[0.98] whitespace-nowrap`,
  {
    variants: {
      variant: {
        default: "bg-brand text-title-foreground hover:bg-brand/90 focus-visible:ring-brand/80 shadow-sm",
        "default-outline":
          "bg-transparent border border-brand text-title hover:bg-brand/10 focus-visible:ring-brand/60",

        primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 shadow-sm",
        "primary-outline":
          "bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50 focus-visible:ring-blue-500",

        secondary:
          "bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-400 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
        "secondary-outline":
          "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-400 dark:border-gray-600 dark:text-gray-300",

        info: "bg-info text-title-foreground hover:bg-info/90 focus-visible:ring-info/80 shadow-sm",
        "info-outline": "bg-transparent border border-info text-info hover:bg-info/10 focus-visible:ring-info/60",

        warning: "bg-warning text-title-foreground hover:bg-warning/90 focus-visible:ring-warning/80 shadow-sm",
        "warning-outline":
          "bg-transparent border border-warning text-warning hover:bg-warning/10 focus-visible:ring-warning/60",

        danger: "bg-danger text-title-foreground hover:bg-danger/90 focus-visible:ring-danger/80 shadow-sm",
        "danger-outline":
          "bg-transparent border border-danger text-danger hover:bg-danger/10 focus-visible:ring-danger/60",

        success: "bg-success text-title-foreground hover:bg-success/90 focus-visible:ring-success/80 shadow-sm",
        "success-outline":
          "bg-transparent border border-success text-success hover:bg-success/10 focus-visible:ring-success/60",

        ghost: "bg-transparent hover:bg-gray-100 text-title focus-visible:ring-gray-400 dark:hover:bg-gray-800",
        link: "bg-transparent text-info hover:text-info/80 underline-offset-4 hover:underline focus-visible:ring-info/60",

        gradient:
          "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 focus-visible:ring-purple-500 shadow-md",

        "nav-link": `relative font-bold text-title bg-transparent
          before:absolute before:bottom-[-4px] before:left-0 before:w-full before:h-[3px]
          before:bg-brand before:rounded-md before:transition-all before:duration-300
          before:scale-x-0 before:origin-left
          hover:before:scale-x-100 focus-visible:ring-brand/60`,

        icon: "bg-transparent hover:bg-gray-100 text-title focus-visible:ring-gray-400 dark:hover:bg-gray-800",

        "continue-with": `w-full bg-transparent border border-border-color hover:bg-gray-50
          focus-visible:ring-border-color/60 dark:hover:bg-gray-800`,
      },

      size: {
        xs: "h-7 px-2 text-xs gap-1",
        sm: "h-8 px-3 text-sm gap-1.5",
        md: "h-10 px-4 text-sm gap-2",
        lg: "h-11 px-6 text-base gap-2",
        xl: "h-12 px-8 text-lg gap-2.5",
        "icon-xs": "h-7 w-7 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-md": "h-10 w-10 p-0",
        "icon-lg": "h-11 w-11 p-0",
        "icon-xl": "h-12 w-12 p-0",
      },

      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
      },

      shadow: {
        none: "shadow-none",
        sm: "shadow-sm",
        md: "shadow-md",
        lg: "shadow-lg",
        xl: "shadow-xl",
      },

      active: {
        active: "before:scale-x-100",
        inactive: "",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "md",
      rounded: "md",
      shadow: "none",
    },
  },
)

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size">,
    VariantProps<typeof buttonVariants> {
  href?: string
  target?: "_blank" | "_parent" | "_self" | "_top"
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  asChild?: boolean
  animate?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      href,
      variant,
      size,
      rounded,
      shadow,
      active,
      target,
      disabled,
      loading,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth,
      animate = false,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading
    const classes = twMerge(
      buttonVariants({ variant, size, rounded, shadow, active }),
      fullWidth && "w-full",
      className,
    )

    const content = (
      <>
        {loading && <LoadingSpinner size={size} />}
        {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {loading && loadingText ? loadingText : children}
        {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </>
    )

    if (href && !isDisabled) {
      return (
        <Link className={classes} href={href} target={target}>
          {content}
        </Link>
      )
    }

    if (animate) {
      return (
        <button className={classes} ref={ref} type={type} disabled={isDisabled} {...props}>
          {content}
        </button>
      )
    }

    return (
      <button className={classes} ref={ref} type={type} disabled={isDisabled} {...props}>
        {content}
      </button>
    )
  },
)

Button.displayName = "Button"

function LoadingSpinner({ size }: { size?: ButtonProps["size"] }) {
  const sizeClass = size?.includes("icon")
    ? "h-4 w-4"
    : size === "xs"
      ? "h-3 w-3"
      : size === "sm"
        ? "h-3.5 w-3.5"
        : size === "lg"
          ? "h-5 w-5"
          : size === "xl"
            ? "h-6 w-6"
            : "h-4 w-4"

  return (
    <svg
      className={twMerge("animate-spin", sizeClass)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export { Button, buttonVariants }
