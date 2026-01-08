import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      xs: 'size-3',
      sm: 'size-4',
      default: 'size-6',
      lg: 'size-8',
      xl: 'size-12'
    },
    variant: {
      default: 'text-primary',
      secondary: 'text-secondary',
      destructive: 'text-destructive',
      muted: 'text-muted-foreground'
    }
  },
  defaultVariants: {
    size: 'default',
    variant: 'default'
  }
})

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  /**
   * Optional label to display next to the spinner
   */
  label?: string
  /**
   * Position of the label relative to the spinner
   */
  labelPosition?: 'left' | 'right' | 'top' | 'bottom'
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, label, labelPosition = 'right', ...props }, ref) => {
    const content = (
      <>
        <svg
          className={cn(spinnerVariants({ size, variant }), className)}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {label && (
          <span className={cn('text-sm', labelPosition === 'top' || labelPosition === 'bottom' ? 'mt-2' : 'ml-2')}>
            {label}
          </span>
        )}
      </>
    )

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center',
          labelPosition === 'top' && 'flex-col',
          labelPosition === 'bottom' && 'flex-col-reverse',
          labelPosition === 'left' && 'flex-row-reverse'
        )}
        {...props}
      >
        {content}
      </div>
    )
  }
)
Spinner.displayName = 'Spinner'

export { Spinner }
export default Spinner
