import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-[var(--color-icici-orange)] text-white shadow hover:bg-orange-600",
                secondary:
                    "border-transparent bg-[var(--color-icici-blue)] text-white hover:bg-blue-800",
                destructive:
                    "border-transparent bg-red-500 text-white shadow hover:bg-red-600",
                outline: "text-foreground",
                glass: "bg-white/10 border-white/10 text-white backdrop-blur-md",
                icici: "bg-[var(--color-icici-orange)]/20 text-[var(--color-icici-orange)] border border-[var(--color-icici-orange)]/30",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
