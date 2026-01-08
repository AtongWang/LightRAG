import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

const emptyStateVariants = cva('text-center', {
  variants: {
    size: {
      sm: 'p-6',
      default: 'p-12',
      lg: 'p-16'
    }
  },
  defaultVariants: {
    size: 'default'
  }
})

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  /**
   * Icon component to display
   */
  icon?: LucideIcon
  /**
   * Title text
   */
  title: string
  /**
   * Description text
   */
  description?: string
  /**
   * Optional action button
   */
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  }
  /**
   * Whether to wrap in a card
   */
  withCard?: boolean
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      size,
      icon: Icon,
      title,
      description,
      action,
      withCard = true,
      ...props
    },
    ref
  ) => {
    const content = (
      <div
        ref={ref}
        className={cn(emptyStateVariants({ size }), className)}
        {...props}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          {Icon && (
            <div className="rounded-full border border-dashed p-4">
              <Icon className="text-muted-foreground size-12" aria-hidden="true" />
            </div>
          )}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && (
              <p className="text-muted-foreground text-sm max-w-md">{description}</p>
            )}
          </div>
          {action && (
            <Button
              variant={action.variant || 'default'}
              onClick={action.onClick}
              className="mt-2"
            >
              {action.label}
            </Button>
          )}
        </div>
      </div>
    )

    if (withCard) {
      return (
        <Card className="bg-transparent border-transparent shadow-none">
          <CardContent>{content}</CardContent>
        </Card>
      )
    }

    return content
  }
)
EmptyState.displayName = 'EmptyState'

export { EmptyState }
export default EmptyState
