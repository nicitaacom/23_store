"use client"

import * as React from "react"
import Link from "next/link"
import { VariantProps, cva } from "class-variance-authority"
import { twMerge } from "tailwind-merge"

const buttonVariants = cva(
  `inline-flex items-center justify-center border font-primary font-medium outline-none
  transition-[background-color,border-color,color,transform,box-shadow] duration-150 disabled:opacity-50 disabled:pointer-events-none
  focus-visible:ring-1 focus-visible:ring-brand/35 focus-visible:ring-offset-1 focus-visible:ring-offset-background
  active:scale-[0.99] whitespace-nowrap`,
  {
    variants: {
      variant: {
        default: "border-brand/25 bg-brand/12 text-brand hover:border-brand/35 hover:bg-brand/18",
        "default-outline": "border-border-color/40 bg-background/55 text-title hover:border-brand/30 hover:bg-brand/8",

        primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 shadow-sm",
        "primary-outline": "border border-info bg-transparent text-info hover:bg-blue-50 focus-visible:ring-blue-500",

        secondary:
          "border-border-color/35 bg-foreground/65 text-title hover:border-border-color/45 hover:bg-foreground/85",
        "secondary-outline": "border-border-color/35 bg-transparent text-title hover:bg-foreground/35",

        info: "border-info/25 bg-info/12 text-info hover:border-info/35 hover:bg-info/18",
        "info-outline": "border-info/30 bg-transparent text-info hover:bg-info/10",

        warning: "border-warning/25 bg-warning/12 text-warning hover:border-warning/35 hover:bg-warning/18",
        "warning-outline": "border-warning/30 bg-transparent text-warning hover:bg-warning/10",

        danger: "border-danger/25 bg-danger/14 text-danger hover:border-danger/35 hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-danger/50 focus:ring-2 focus:ring-danger/50",
        "danger-outline": "border-danger/30 bg-transparent text-danger hover:bg-danger/10",

        success: "border-success/25 bg-success/12 text-success hover:border-success/35 hover:bg-success/18",
        "success-outline": "border-success/30 bg-transparent text-success hover:bg-success/10",

        ghost: "border-transparent bg-transparent text-title hover:border-border-color/25 hover:bg-foreground/35",
        link: "border-transparent bg-transparent px-0 text-info hover:text-info/80 underline-offset-2 hover:underline focus-visible:ring-0",

        gradient: "border-brand/35 bg-brand/18 text-brand hover:bg-brand/24",

        "nav-link": `relative border-transparent font-bold text-title bg-transparent
          before:absolute before:bottom-[-4px] before:left-0 before:w-full before:h-[3px]
          before:bg-brand before:rounded-md before:transition-all before:duration-300
          before:scale-x-0 before:origin-left
          hover:before:scale-x-100 focus-visible:ring-brand/60`,

        icon: "border-border-color/35 bg-background/55 text-title hover:bg-foreground/35",

        "continue-with": "w-full border-border-color/35 bg-background/65 text-title hover:bg-foreground/35",
      },

      size: {
        xs: "h-6 px-2 text-[11px] gap-1",
        sm: "h-7 px-2.5 text-xs gap-1",
        md: "h-8 px-3 text-sm gap-1.5",
        lg: "h-9 px-3.5 text-sm gap-1.5",
        xl: "h-10 px-4 text-base gap-2",
        "icon-xs": "h-6 w-6 p-0",
        "icon-sm": "h-7 w-7 p-0",
        "icon-md": "h-8 w-8 p-0",
        "icon-lg": "h-9 w-9 p-0",
        "icon-xl": "h-10 w-10 p-0",
      },

      rounded: {
        none: "rounded-none",
        sm: "rounded-[2px]",
        md: "rounded",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
      },

      shadow: {
        none: "shadow-none",
        sm: "shadow-[0_1px_0_rgba(255,255,255,0.03)]",
        md: "shadow-compact",
        lg: "shadow-compact-lg",
        xl: "shadow-compact-lg",
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
    const classes = twMerge(buttonVariants({ variant, size, rounded, shadow, active }), fullWidth && "w-full", className)

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
        ? "h-3 w-3"
        : size === "lg"
          ? "h-4 w-4"
          : size === "xl"
            ? "h-5 w-5"
            : "h-4 w-4"

  return (
    <svg className={twMerge("animate-spin", sizeClass)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
