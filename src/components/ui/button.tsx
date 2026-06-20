import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-extrabold tracking-wide uppercase whitespace-nowrap transition-all duration-300 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/95 shadow-[0_4px_16px_rgba(59,130,246,0.25)] hover:shadow-[0_6px_24px_rgba(59,130,246,0.45)] hover:scale-[1.01] duration-300",
        outline:
          "border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 hover:scale-[1.01] duration-300",
        secondary:
          "cine-glass text-white border border-white/8 hover:bg-white/10 hover:border-white/18 hover:scale-[1.01] duration-300 shadow-md",
        ghost:
          "text-white/80 hover:text-white hover:bg-white/5 transition-colors duration-300",
        destructive:
          "bg-red-600 text-white shadow-[0_4px_16px_rgba(239,68,68,0.2)] hover:bg-red-500 hover:shadow-[0_6px_24px_rgba(239,68,68,0.45)] hover:scale-[1.01] duration-300",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-11 min-h-[44px] gap-2 px-5 rounded-xl text-xs",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 text-[10px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 min-h-[36px] gap-1.5 rounded-xl px-4 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 min-h-[48px] gap-2.5 px-6 rounded-xl text-sm",
        icon: "size-11 min-h-[44px]",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-9 rounded-xl",
        "icon-lg": "size-12 min-h-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
