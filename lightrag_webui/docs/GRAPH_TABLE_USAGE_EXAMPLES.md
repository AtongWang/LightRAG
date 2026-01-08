# Graph Visualization and Table View - Usage Examples

This document provides practical examples for using the new graph visualization and table view components.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [GraphViewer Integration](#graphviewer-integration)
3. [TableView Integration](#tableview-integration)
4. [Advanced Examples](#advanced-examples)
5. [Customization](#customization)

---

## Basic Usage

### Using NodePropertiesPanel

```tsx
import { useState } from 'react'
import NodePropertiesPanel from '@/components/graph/NodePropertiesPanel'
import { useGraphStore } from '@/stores/graph'

function MyComponent() {
  const [showPanel, setShowPanel] = useState(false)
  const selectedNode = useGraphStore.use.selectedNode()
  const rawGraph = useGraphStore.use.rawGraph()

  const getNode = (nodeId: string) => {
    return rawGraph?.getNode(nodeId)
  }

  return (
    <>
      <button onClick={() => setShowPanel(true)}>
        Show Properties
      </button>

      {showPanel && selectedNode && (
        <div className="fixed top-0 right-0 z-50 p-4">
          <NodePropertiesPanel
            node={getNode(selectedNode)}
            onClose={() => setShowPanel(false)}
            enableAIEnrichment={true}
          />
        </div>
      )}
    </>
  )
}
```

### Using TableView

```tsx
import TableView from '@/features/table'

function GraphPage() {
  return (
    <div className="h-screen">
      <TableView />
    </div>
  )
}
```

---

## GraphViewer Integration

### Enhanced GraphViewer with NodePropertiesPanel

```tsx
import { useEffect, useState } from 'react'
import { useGraphStore } from '@/stores/graph'
import { useSettingsStore } from '@/stores/settings'
import NodePropertiesPanel from '@/components/graph/NodePropertiesPanel'

function EnhancedGraphViewer() {
  const selectedNode = useGraphStore.use.selectedNode()
  const rawGraph = useGraphStore.use.rawGraph()
  const showPropertyPanel = useSettingsStore.use.showPropertyPanel()

  const [panelNode, setPanelNode] = useState<RawNodeType | null>(null)

  // Update panel node when selection changes
  useEffect(() => {
    if (selectedNode && rawGraph) {
      const node = rawGraph.getNode(selectedNode)
      setPanelNode(node || null)
    } else {
      setPanelNode(null)
    }
  }, [selectedNode, rawGraph])

  return (
    <div className="relative h-full w-full">
      {/* Existing GraphViewer component */}
      <GraphViewer />

      {/* Enhanced properties panel */}
      {showPropertyPanel && panelNode && (
        <div className="absolute top-2 right-2 z-10">
          <NodePropertiesPanel
            node={panelNode}
            onClose={() => useGraphStore.getState().setSelectedNode(null)}
            enableAIEnrichment={true}
          />
        </div>
      )}
    </div>
  )
}
```

### Custom Image Node Rendering

```tsx
import { useEffect } from 'react'
import { useSigma } from '@react-sigma/core'
import { renderImageNode, useImageCache } from '@/components/graph/ImageNodeRenderer'

function CustomNodeRenderer() {
  const sigma = useSigma()
  const { loadImage } = useImageCache()

  useEffect(() => {
    const graph = sigma.getGraph()

    // Add images to nodes
    graph.forEachNode(async (node) => {
      const imageUrl = graph.getNodeAttribute(node, 'image_url')
      if (imageUrl) {
        const img = await loadImage(imageUrl)
        if (img) {
          graph.setNodeAttribute(node, 'image', img)
          graph.setNodeAttribute(node, 'hasImage', true)
        }
      }
    })

    // Refresh graph to show images
    sigma.refresh()
  }, [sigma, loadImage])

  return null
}

// Usage in GraphViewer
function GraphViewerWithImages() {
  return (
    <SigmaContainer settings={sigmaSettings}>
      <CustomNodeRenderer />
      <GraphControl />
      {/* ... other components */}
    </SigmaContainer>
  )
}
```

---

## TableView Integration

### TableView with View Toggle

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Network, Table } from 'lucide-react'
import GraphViewer from '@/features/GraphViewer'
import TableView from '@/features/table'

type ViewMode = 'graph' | 'table'

function GraphPageWithToggle() {
  const [viewMode, setViewMode] = useState<ViewMode>('graph')

  return (
    <div className="h-full flex flex-col">
      {/* View Toggle Header */}
      <div className="flex items-center gap-2 p-4 border-b">
        <Button
          variant={viewMode === 'graph' ? 'default' : 'ghost'}
          onClick={() => setViewMode('graph')}
        >
          <Network className="h-4 w-4 mr-2" />
          Graph View
        </Button>
        <Button
          variant={viewMode === 'table' ? 'default' : 'ghost'}
          onClick={() => setViewMode('table')}
        >
          <Table className="h-4 w-4 mr-2" />
          Table View
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1">
        {viewMode === 'graph' ? <GraphViewer /> : <TableView />}
      </div>
    </div>
  )
}
```

### TableView with Custom Filters

```tsx
import { useState, useMemo } from 'react'
import TableView from '@/features/table'
import { useGraphStore } from '@/stores/graph'

function FilteredTableView() {
  const rawGraph = useGraphStore.use.rawGraph()
  const [minDegree, setMinDegree] = useState(0)
  const [hasImage, setHasImage] = useState(false)

  // Filter logic would need to be added to TableView component
  const filteredNodes = useMemo(() => {
    if (!rawGraph?.nodes) return []

    return rawGraph.nodes.filter(node => {
      if (node.degree < minDegree) return false
      if (hasImage && !node.properties?.image_url) return false
      return true
    })
  }, [rawGraph, minDegree, hasImage])

  return (
    <div className="h-full flex flex-col">
      {/* Custom Filter Controls */}
      <div className="p-4 border-b space-y-3">
        <div>
          <label className="text-sm font-medium">Minimum Degree</label>
          <input
            type="range"
            min="0"
            max="100"
            value={minDegree}
            onChange={(e) => setMinDegree(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-xs text-gray-500">{minDegree}</span>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasImage}
            onChange={(e) => setHasImage(e.target.checked)}
          />
          <span className="text-sm">Only nodes with images</span>
        </label>
      </div>

      {/* Table with filtered data */}
      <TableView />
    </div>
  )
}
```

---

## Advanced Examples

### Split View (Graph + Table)

```tsx
import { useState } from 'react'
import { useGraphStore } from '@/stores/graph'
import GraphViewer from '@/features/GraphViewer'
import TableView from '@/features/table'

function SplitView() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const setSelectedNode = useGraphStore.use.setSelectedNode()

  // Sync selection between graph and table
  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    setSelectedNode(nodeId, false) // Don't move camera
  }

  return (
    <div className="h-full flex">
      {/* Graph View - Left */}
      <div className="w-1/2 border-r">
        <GraphViewer />
      </div>

      {/* Table View - Right */}
      <div className="w-1/2">
        <TableView />
      </div>
    </div>
  )
}
```

### Property Enrichment Workflow

```tsx
import { useState } from 'react'
import NodePropertiesPanel from '@/components/graph/NodePropertiesPanel'
import { enrichEntity } from '@/api/lightrag'
import { toast } from 'sonner'

function EnrichmentWorkflow() {
  const [enrichingNodes, setEnrichingNodes] = useState<Set<string>>(new Set())
  const selectedNode = useGraphStore.use.selectedNode()
  const rawGraph = useGraphStore.use.rawGraph()

  const handleBatchEnrich = async (nodeIds: string[]) => {
    const results = await Promise.allSettled(
      nodeIds.map(nodeId => {
        const node = rawGraph?.getNode(nodeId)
        const entityId = node?.properties?.entity_id || nodeId
        return enrichEntity(entityId)
      })
    )

    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failureCount = results.filter(r => r.status === 'rejected').length

    if (successCount > 0) {
      toast.success(`Enriched ${successCount} nodes`)
    }
    if (failureCount > 0) {
      toast.error(`Failed to enrich ${failureCount} nodes`)
    }

    // Refresh graph
    useGraphStore.getState().incrementGraphDataVersion()
  }

  return (
    <div>
      <button onClick={() => handleBatchEnrich(['node1', 'node2', 'node3'])}>
        Batch Enrich Selected
      </button>
    </div>
  )
}
```

### Custom Node Properties Display

```tsx
import NodePropertiesPanel from '@/components/graph/NodePropertiesPanel'

// Extend with custom property renderers
const CustomPropertyRow = ({ name, value }: { name: string; value: any }) => {
  if (name === 'location' && value?.lat && value?.lng) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">Location:</span>
        <a
          href={`https://maps.google.com/?q=${value.lat},${value.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {value.lat}, {value.lng}
        </a>
      </div>
    )
  }

  if (name === 'website') {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">Website:</span>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {value}
        </a>
      </div>
    )
  }

  return null
}

function ExtendedPropertiesPanel({ node }: { node: RawNodeType }) {
  return (
    <div>
      <NodePropertiesPanel node={node} />

      {/* Custom property renderers */}
      <div className="mt-4 space-y-2">
        {Object.entries(node.properties).map(([name, value]) => (
          <CustomPropertyRow key={name} name={name} value={value} />
        ))}
      </div>
    </div>
  )
}
```

---

## Customization

### Custom Table Columns

```tsx
import { useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { RawNodeType } from '@/stores/graph'

function CustomTableView() {
  const columnHelper = createColumnHelper<RawNodeType>()

  const customColumns = useMemo(() => [
    // ... default columns ...

    // Custom column: Last Updated
    columnHelper.accessor(
      row => row.properties?.updated_at,
      {
        id: 'updated_at',
        header: 'Last Updated',
        cell: info => {
          const date = new Date(info.getValue())
          return date.toLocaleDateString()
        }
      }
    ),

    // Custom column: Actions
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: props => (
        <button onClick={() => handleEdit(props.row.original)}>
          Edit
        </button>
      )
    })
  ], [])

  // Use customColumns in table instance
  // ...
}
```

### Custom Image Rendering

```tsx
import { renderImageNode } from '@/components/graph/ImageNodeRenderer'

// Custom render function with additional effects
function renderImageNodeWithGlow(
  context: CanvasRenderingContext2D,
  data: any,
  settings: any
) {
  // First render the base image node
  renderImageNode(context, data, settings)

  // Add glow effect for selected nodes
  if (data.highlighted) {
    const { x, y, size } = data
    const gradient = context.createRadialGradient(x, y, 0, x, y, size)

    gradient.addColorStop(0, 'rgba(245, 127, 23, 0.3)')
    gradient.addColorStop(1, 'rgba(245, 127, 23, 0)')

    context.fillStyle = gradient
    context.fillRect(x - size, y - size, size * 2, size * 2)
  }
}
```

### Custom Property Panel Layout

```tsx
import NodePropertiesPanel from '@/components/graph/NodePropertiesPanel'

function CompactPropertiesPanel({ node }: { node: RawNodeType }) {
  return (
    <div className="bg-background/90 rounded border p-2 text-xs">
      {/* Compact header */}
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">{node.labels[0]}</span>
        <span className="text-gray-500">Degree: {node.degree}</span>
      </div>

      {/* Compact properties */}
      <div className="space-y-1">
        {Object.entries(node.properties)
          .filter(([key]) => !['created_at', 'truncate'].includes(key))
          .slice(0, 5) // Only show first 5
          .map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="font-medium">{key}:</span>
              <span className="truncate">{String(value)}</span>
            </div>
          ))}
      </div>

      {/* Expand button */}
      <button className="mt-2 text-blue-500 hover:underline">
        Show More
      </button>
    </div>
  )
}
```

---

## Best Practices

### 1. Performance Optimization

```tsx
// Memoize expensive computations
import { useMemo } from 'react'

function MyGraphComponent() {
  const rawGraph = useGraphStore.use.rawGraph()

  const nodesWithImages = useMemo(() => {
    return rawGraph?.nodes.filter(node => node.properties?.image_url) || []
  }, [rawGraph])

  // Use memoized value
  // ...
}
```

### 2. Error Handling

```tsx
import { toast } from 'sonner'

async function handleNodeAction(nodeId: string) {
  try {
    await updateNode(nodeId, data)
    toast.success('Node updated successfully')
  } catch (error) {
    console.error('Error updating node:', error)
    toast.error('Failed to update node')
  }
}
```

### 3. Loading States

```tsx
import { useState } from 'react'

function LoadingExample() {
  const [isLoading, setIsLoading] = useState(false)

  const handleAction = async () => {
    setIsLoading(true)
    try {
      await performAction()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button disabled={isLoading} onClick={handleAction}>
      {isLoading ? 'Loading...' : 'Action'}
    </button>
  )
}
```

---

## Testing Examples

### Unit Test Example

```tsx
import { render, screen } from '@testing-library/react'
import NodePropertiesPanel from '@/components/graph/NodePropertiesPanel'

describe('NodePropertiesPanel', () => {
  const mockNode = {
    id: 'test-node',
    labels: ['Test Label'],
    properties: {
      entity_id: 'test-entity',
      entity_type: 'test-type',
      description: 'Test description'
    },
    size: 10,
    x: 0.5,
    y: 0.5,
    color: '#FF0000',
    degree: 5
  }

  it('renders node properties correctly', () => {
    render(<NodePropertiesPanel node={mockNode} />)

    expect(screen.getByText('Test Label')).toBeInTheDocument()
    expect(screen.getByText('test-entity')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })
})
```

---

## Troubleshooting

### Common Issues

1. **Images not loading**
   - Check CORS settings on image server
   - Verify image URLs are correct
   - Check browser console for errors

2. **Table not updating**
   - Ensure `graphDataVersion` is incremented after updates
   - Check that `rawGraph` is not null
   - Verify store subscriptions

3. **Properties panel not showing**
   - Check that `selectedNode` is set in store
   - Verify `rawGraph.getNode()` returns node data
   - Ensure component is mounted

---

For more details, see:
- [GRAPH_TABLE_DESIGN.md](./GRAPH_TABLE_DESIGN.md) - Detailed design documentation
- [AGENT4_SUMMARY.md](./AGENT4_SUMMARY.md) - Implementation summary
