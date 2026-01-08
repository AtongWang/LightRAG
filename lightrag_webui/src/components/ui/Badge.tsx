import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground border-border',
        success: 'border-transparent bg-green-500 text-white shadow hover:bg-green-600',
        warning: 'border-transparent bg-yellow-500 text-white shadow hover:bg-yellow-600',
        info: 'border-transparent bg-blue-500 text-white shadow hover:bg-blue-600',
        entity: 'border-transparent bg-purple-500 text-white shadow hover:bg-purple-600',
        relation: 'border-transparent bg-orange-500 text-white shadow hover:bg-orange-600',
        organization: 'border-transparent bg-cyan-500 text-white shadow hover:bg-cyan-600',
        person: 'border-transparent bg-pink-500 text-white shadow hover:bg-pink-600',
        location: 'border-transparent bg-emerald-500 text-white shadow hover:bg-emerald-600',
        event: 'border-transparent bg-amber-500 text-white shadow hover:bg-amber-600',
        concept: 'border-transparent bg-indigo-500 text-white shadow hover:bg-indigo-600'
      },
      size: {
        default: 'text-xs',
        sm: 'text-[10px] px-2 py-0',
        lg: 'text-sm px-3 py-1'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: LucideIcon
}

function Badge({ className, variant, size, icon: Icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {Icon && <Icon className="size-3" />}
      {children}
    </div>
  )
}

export { Badge }
export default Badge
