# UI Components Usage Examples

This document provides usage examples for the newly created/enhanced UI components.

## Card

Enhanced card component with multiple variants and hover effects.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'

// Default variant
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description goes here</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here.</p>
  </CardContent>
  <CardFooter>
    <p>Card footer</p>
  </CardFooter>
</Card>

// Outlined variant
<Card variant="outlined">
  <CardContent>
    <p>This is an outlined card with a thicker border.</p>
  </CardContent>
</Card>

// Elevated variant with hover effect
<Card variant="elevated" hoverable>
  <CardContent>
    <p>This card has a larger shadow and hover effects.</p>
  </CardContent>
</Card>
```

### Props

- `variant?: 'default' | 'outlined' | 'elevated'` - Card style variant
- `hoverable?: boolean` - Enable hover effects
- All standard HTML div attributes

## Badge

Enhanced badge component with support for entity types, colors, sizes, and icons.

```tsx
import { Badge } from '@/components/ui/Badge'
import { Building2, User, MapPin } from 'lucide-react'

// Basic badges
<Badge>Default Badge</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="destructive">Error</Badge>

// Entity type badges (color-coded)
<Badge variant="entity">Entity</Badge>
<Badge variant="relation">Relation</Badge>
<Badge variant="organization">Organization</Badge>
<Badge variant="person">Person</Badge>
<Badge variant="location">Location</Badge>
<Badge variant="event">Event</Badge>
<Badge variant="concept">Concept</Badge>

// With icons
<Badge variant="organization" icon={Building2}>
  Organization
</Badge>
<Badge variant="person" icon={User}>
  John Doe
</Badge>
<Badge variant="location" icon={MapPin}>
  New York
</Badge>

// Different sizes
<Badge size="sm">Small</Badge>
<Badge size="default">Default</Badge>
<Badge size="lg">Large</Badge>
```

### Props

- `variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'entity' | 'relation' | 'organization' | 'person' | 'location' | 'event' | 'concept'`
- `size?: 'sm' | 'default' | 'lg'`
- `icon?: LucideIcon` - Optional icon component
- All standard HTML div attributes

## Spinner

Loading spinner with configurable size, color, and optional label.

```tsx
import { Spinner } from '@/components/ui/Spinner'

// Basic spinner
<Spinner />

// With different sizes
<Spinner size="xs" />
<Spinner size="sm" />
<Spinner size="default" />
<Spinner size="lg" />
<Spinner size="xl" />

// With different variants (colors)
<Spinner variant="default" />
<Spinner variant="secondary" />
<Spinner variant="destructive" />
<Spinner variant="muted" />

// With label
<Spinner label="Loading..." />
<Spinner label="Processing..." labelPosition="right" />
<Spinner label="Loading..." labelPosition="left" />
<Spinner label="Loading..." labelPosition="top" />
<Spinner label="Loading..." labelPosition="bottom" />
```

### Props

- `size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'` - Spinner size
- `variant?: 'default' | 'secondary' | 'destructive' | 'muted'` - Color variant
- `label?: string` - Optional text label
- `labelPosition?: 'left' | 'right' | 'top' | 'bottom'` - Label position (default: 'right')
- All standard HTML div attributes

## EmptyState

Empty state component for displaying no data scenarios with optional actions.

```tsx
import { EmptyState } from '@/components/ui/Emp\tyState'
import { FileText, Search, Inbox } from 'lucide-react'

// Basic empty state
<EmptyState
  title="No documents found"
  description="Upload your first document to get started."
/>

// With icon
<EmptyState
  icon={FileText}
  title="No documents"
  description="You haven't uploaded any documents yet."
/>

// With action button
<EmptyState
  icon={Inbox}
  title="No results found"
  description="Try adjusting your search or filters."
  action={{
    label: 'Clear Filters',
    onClick: () => console.log('Clear filters')
  }}
/>

// With custom action variant
<EmptyState
  icon={Search}
  title="No search results"
  description="No documents match your search query."
  action={{
    label: 'New Search',
    onClick: () => console.log('New search'),
    variant: 'outline'
  }}
/>

// Different sizes
<EmptyState size="sm" title="No data" />
<EmptyState size="default" title="No data" />
<EmptyState size="lg" title="No data" />

// Without card wrapper
<EmptyState
  withCard={false}
  title="Custom styling"
  description="This has no card wrapper"
/>

// Custom styling
<EmptyState
  title="Custom Empty State"
  description="With custom className"
  className="bg-muted/50"
/>
```

### Props

- `icon?: LucideIcon` - Icon component to display
- `title: string` - Title text
- `description?: string` - Description text
- `action?: { label: string; onClick: () => void; variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive' }`
- `size?: 'sm' | 'default' | 'lg'` - Padding size
- `withCard?: boolean` - Wrap in card (default: true)
- All standard HTML div attributes

## ProgressBar

Enhanced progress bar with percentage display, striped patterns, and animations.

```tsx
import { ProgressBar } from '@/components/ui/ProgressBar'

// Basic progress bar
<ProgressBar value={50} />

// With percentage label
<ProgressBar value={75} showLabel />

// With label in different positions
<ProgressBar value={60} showLabel labelPosition="top" />
<ProgressBar value={60} showLabel labelPosition="bottom" />
<ProgressBar value={60} showLabel labelPosition="inside" />

// Different sizes
<ProgressBar value={50} size="sm" />
<ProgressBar value={50} size="default" />
<ProgressBar value={50} size="lg" />

// Different variants (colors)
<ProgressBar value={50} variant="default" />
<ProgressBar value={50} variant="success" />
<ProgressBar value={50} variant="warning" />
<ProgressBar value={50} variant="destructive" />
<ProgressBar value={50} variant="info" />

// Striped pattern
<ProgressBar value={60} striped />

// Animated stripes
<ProgressBar value={70} striped animated />

// Custom label format
<ProgressBar
  value={45}
  showLabel
  labelFormat={(value) => `${value} / 100`}
/>

// Real-world example: File upload progress
<ProgressBar
  value={uploadProgress}
  showLabel
  labelPosition="bottom"
  variant="success"
  striped
  animated
/>
```

### Props

- `value?: number` - Progress value (0-100)
- `showLabel?: boolean` - Show percentage label
- `labelFormat?: (value: number) => string` - Custom label format function
- `labelPosition?: 'top' | 'bottom' | 'inside'` - Label position (default: 'top')
- `size?: 'sm' | 'default' | 'lg'` - Bar height
- `variant?: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'` - Color variant
- `striped?: boolean` - Apply striped pattern
- `animated?: boolean` - Animate stripes (requires striped=true)
- All standard Radix UI Progress Root attributes

## Complete Example: Document Upload

```tsx
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { FileText, Upload } from 'lucide-react'

function DocumentUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  if (uploading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uploading Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Spinner label="Uploading..." size="lg" />
          <ProgressBar
            value={progress}
            showLabel
            striped
            animated
            variant="success"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={FileText}
          title="No documents uploaded"
          description="Upload documents to build your knowledge graph"
          action={{
            label: 'Upload Document',
            onClick: () => setUploading(true),
            variant: 'default'
          }}
        />
      </CardContent>
    </Card>
  )
}
```

## Entity Badge Example

```tsx
import { Badge } from '@/components/ui/Badge'
import { Building2, User, MapPin, Calendar, Lightbulb } from 'lucide-react'

function EntityBadges() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="organization" icon={Building2}>
        Google Inc.
      </Badge>
      <Badge variant="person" icon={User}>
        John Smith
      </Badge>
      <Badge variant="location" icon={MapPin}>
        San Francisco
      </Badge>
      <Badge variant="event" icon={Calendar}>
        Product Launch
      </Badge>
      <Badge variant="concept" icon={Lightbulb}>
        Machine Learning
      </Badge>
    </div>
  )
}
```
