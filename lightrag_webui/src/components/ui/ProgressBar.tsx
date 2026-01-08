import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// Add custom animation for striped progress bar
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes progress-bar-stripes {
      0% { background-position: 1rem 0; }
      100% { background-position: 0 0; }
    }
  `
  document.head.appendChild(style)
}

const progressBarVariants = cva('w-full overflow-hidden rounded-full transition-all', {
  variants: {
    size: {
      sm: 'h-1.5',
      default: 'h-4',
      lg: 'h-6'
    },
    variant: {
      default: 'bg-secondary',
      secondary: 'bg-muted',
      destructive: 'bg-destructive/20',
      success: 'bg-green-500/20',
      warning: 'bg-yellow-500/20',
      info: 'bg-blue-500/20'
    }
  },
  defaultVariants: {
    size: 'default',
    variant: 'default'
  }
})

const indicatorVariants = cva('h-full w-full transition-all duration-300 ease-in-out', {
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-secondary-foreground',
      destructive: 'bg-destructive',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    },
    striped: {
      true: 'bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)]',
      false: ''
    },
    animated: {
      true: 'animate-[progress-bar-stripes_1s_linear_infinite]',
      false: ''
    }
  },
  defaultVariants: {
    variant: 'default',
    striped: false,
    animated: false
  }
})

export interface ProgressBarProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressBarVariants>,
    VariantProps<typeof indicatorVariants> {
  /**
   * Current progress value (0-100)
   */
  value?: number
  /**
   * Show percentage label
   */
  showLabel?: boolean
  /**
   * Custom label format
   */
  labelFormat?: (value: number) => string
  /**
   * Position of the label
   */
  labelPosition?: 'top' | 'bottom' | 'inside'
  /**
   * Whether to apply striped pattern
   */
  striped?: boolean
  /**
   * Whether to animate the stripes
   */
  animated?: boolean
}

const ProgressBar = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ProgressBarProps
>(
  (
    {
      className,
      value = 0,
      size,
      variant,
      showLabel = false,
      labelFormat = (val) => `${Math.round(val)}%`,
      labelPosition = 'top',
      striped = false,
      animated = false,
      ...props
    },
    ref
  ) => {
    // Ensure value is between 0 and 100
    const clampedValue = Math.max(0, Math.min(100, value))

    const label = labelFormat(clampedValue)

    return (
      <div className="w-full">
        {(showLabel && labelPosition === 'top') && (
          <div className="mb-1 flex justify-end">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </div>
        )}
        <ProgressPrimitive.Root
          ref={ref}
          className={cn(progressBarVariants({ size, variant }), className)}
          value={clampedValue}
          {...props}
        >
          <ProgressPrimitive.Indicator
            className={cn(
              indicatorVariants({ variant, striped, animated }),
              'flex items-center justify-center'
            )}
            style={{ transform: `translateX(-${100 - clampedValue}%)` }}
          >
            {showLabel && labelPosition === 'inside' && (
              <span className="text-[10px] font-semibold text-white drop-shadow">
                {label}
              </span>
            )}
          </ProgressPrimitive.Indicator>
        </ProgressPrimitive.Root>
        {(showLabel && labelPosition === 'bottom') && (
          <div className="mt-1 flex justify-end">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </div>
        )}
      </div>
    )
  }
)
ProgressBar.displayName = 'ProgressBar'

export { ProgressBar }
export default ProgressBar
