# Graph Visualization and Table View Design

## Overview

This document describes the design and implementation of enhanced graph visualization and table view components for LightRAG WebUI, focusing on image node rendering, enhanced properties panels, and a tabular data view.

## Components Created

### 1. ImageNodeRenderer Component

**Location:** `/home/frankw/LightRAG/lightrag_webui/src/components/graph/ImageNodeRenderer.tsx`

**Purpose:** Render image nodes in the knowledge graph with circular clipping and border support.

**Features:**
- Circular clipping for images with custom borders
- Border color based on entity type
- Fallback handling for image load failures
- Image cache management for performance
- Custom rendering function for Sigma.js integration

**Key Functions:**
- `renderImageNode()`: Custom Sigma.js rendering function for image nodes
- `useImageCache()`: Hook for preloading and caching images

**Usage Example:**
```tsx
import ImageNodeRenderer, { renderImageNode, useImageCache } from '@/components/graph/ImageNodeRenderer'

// In custom node program
const render = (context, data, settings) => {
  renderImageNode(context, data, settings)
}
```

**Props:**
- `nodeId`: Node identifier
- `imageUrl`: URL of the image to display
- `alt`: Alternative text for accessibility
- `size`: Node size in sigma coordinates (default: 10)
- `borderColor`: Border color based on entity type (default: '#F57F17')
- `borderWidth`: Border width (default: 2)

---

### 2. NodePropertiesPanel Component

**Location:** `/home/frankw/LightRAG/lightrag_webui/src/components/graph/NodePropertiesPanel.tsx`

**Purpose:** Enhanced panel for displaying and editing node properties with image support.

**Features:**
- Display basic node information (ID, labels, degree)
- Show node image if available
- Display all properties with editable support
- Add new properties dynamically
- AI enrichment button (when enabled)
- Property value formatting (handles `<SEP>` separators)

**Usage Example:**
```tsx
import NodePropertiesPanel from '@/components/graph/NodePropertiesPanel'

<NodePropertiesPanel
  node={selectedNode}
  onClose={() => setShowPanel(false)}
  enableAIEnrichment={true}
/>
```

**Props:**
- `node`: RawNodeType - Node data to display
- `onClose?`: () => void - Callback when panel is closed
- `enableAIEnrichment?`: boolean - Enable AI enrichment features (default: false)

**Key Features:**
1. **Property Display**
   - System properties filtered (created_at, truncate, etc.)
   - Image properties extracted and displayed separately
   - Editable properties marked with edit icon
   - Tooltip support for long values

2. **Add Property**
   - Form for adding new properties
   - Validation for property name and value
   - Duplicate property checking
   - API integration for property creation

3. **AI Enrichment**
   - Button to trigger AI-based property enrichment
   - Loading state during enrichment
   - Success/error toast notifications
   - Auto-refresh after enrichment

**Supported Editable Properties:**
- `description`
- `entity_id`
- `entity_type`
- `keywords`

---

### 3. TableView Component

**Location:** `/home/frankw/LightRAG/lightrag_webui/src/features/table/TableView.tsx`

**Purpose:** Tabular view of knowledge graph nodes with filtering, sorting, and search capabilities.

**Features:**
- Display nodes in a sortable, filterable table
- Filter by entity type
- Global search across all columns
- Image thumbnails for nodes with images
- Responsive design with sticky header
- Row click to select node in graph
- Dark theme support

**Columns:**
1. **ID**: Node identifier
2. **Labels**: Node labels (comma-separated)
3. **Type**: Entity type (filterable)
4. **Degree**: Node degree (number of connections)
5. **Description**: Node description (truncated to 100 chars)
6. **Image**: Thumbnail image (if available)

**Usage Example:**
```tsx
import TableView from '@/features/table'

<TableView />
```

**State Management:**
- Uses `useGraphStore` for node data
- Uses `useSettingsStore` for theme
- Reactive to `graphDataVersion` changes

**Features:**
1. **Filtering**
   - Entity type dropdown filter
   - Global search input
   - Multi-column filtering support

2. **Sorting**
   - Click column headers to sort
   - Visual indicators for sort direction
   - Tri-state: unsorted → asc → desc → unsorted

3. **Interaction**
   - Click row to select node in graph
   - Hover effects for better UX
   - Image thumbnails with error handling

4. **Responsive Design**
   - Fixed header with sticky positioning
   - Horizontal scroll for wide tables
   - Flexible column widths
   - Loading and empty states

---

## Integration with Existing Components

### GraphViewer Integration

The new components are designed to work seamlessly with the existing GraphViewer:

```tsx
// In GraphViewer.tsx
import NodePropertiesPanel from '@/components/graph/NodePropertiesPanel'

// Replace existing PropertiesView with enhanced NodePropertiesPanel
{showPropertyPanel && selectedNode && (
  <div className="absolute top-2 right-2 z-10">
    <NodePropertiesPanel
      node={getNode(selectedNode)}
      onClose={() => setSelectedNode(null)}
      enableAIEnrichment={true}
    />
  </div>
)}
```

### Store Integration

All components use the existing Zustand stores:

- **useGraphStore**: Access to graph data, selected nodes, edges
- **useSettingsStore**: Theme, settings preferences

```tsx
import { useGraphStore } from '@/stores/graph'
import { useSettingsStore } from '@/stores/settings'

const rawGraph = useGraphStore.use.rawGraph()
const selectedNode = useGraphStore.use.selectedNode()
const theme = useSettingsStore.use.theme()
```

---

## Design Decisions

### 1. Image Handling

**Decision:** Preload and cache images for performance.

**Rationale:**
- Avoids flickering when scrolling
- Reduces network requests
- Better user experience

**Implementation:**
```tsx
const { imageCache, loadImage } = useImageCache()
const img = await loadImage(url)
```

### 2. Property Editing

**Decision:** Reuse existing EditablePropertyRow component.

**Rationale:**
- Consistent UI across the application
- Proven functionality
- Reduces code duplication

### 3. Table Framework

**Decision:** Use @tanstack/react-table (v8.21.3).

**Rationale:**
- Already in project dependencies
- Headless and flexible
- Excellent TypeScript support
- Performance optimized
- Active maintenance

### 4. Responsive Design

**Decision:** Use Tailwind CSS with dark mode support.

**Rationale:**
- Consistent with existing design system
- Built-in dark mode classes
- Mobile-first approach
- Utility-first for rapid development

---

## API Requirements

The components assume the following API endpoints exist (to be implemented):

### 1. Add Property

```typescript
POST /api/entities/{entityId}/properties
{
  "property_name": "value"
}
```

### 2. AI Enrichment

```typescript
POST /api/entities/{entityId}/enrich
```

### 3. Entity Update (already exists)

```typescript
PUT /api/entities/{entityId}
```

---

## Translation Keys

Add the following keys to your i18n configuration:

```json
{
  "graphPanel": {
    "imageNode": {
      "loadError": "Failed to load image"
    },
    "propertiesView": {
      "node": {
        "title": "Node Properties",
        "basicInfo": "Basic Information",
        "image": "Image",
        "properties": "Properties",
        "addProperty": "Add Property",
        "propertyNamePlaceholder": "Property name",
        "propertyValuePlaceholder": "Property value",
        "noProperties": "No properties",
        "enriching": "Enriching...",
        "aiEnrich": "AI Enrichment",
        "propertyNames": {
          "entity_id": "Entity ID",
          "entity_type": "Entity Type",
          "description": "Description",
          "keywords": "Keywords"
        }
      },
      "errors": {
        "propertyRequired": "Property name and value are required",
        "propertyExists": "Property already exists",
        "addPropertyFailed": "Failed to add property",
        "aiEnrichmentFailed": "AI enrichment failed"
      },
      "success": {
        "propertyAdded": "Property added successfully",
        "aiEnrichment": "AI enrichment completed"
      }
    },
    "table": {
      "title": "Node Table",
      "id": "ID",
      "labels": "Labels",
      "entityType": "Type",
      "degree": "Degree",
      "description": "Description",
      "image": "Image",
      "allTypes": "All Types",
      "searchPlaceholder": "Search nodes...",
      "noData": "No data available",
      "noResults": "No results found",
      "nodeCount": "{{count}} nodes",
      "showing": "Showing {{count}} of {{total}} nodes",
      "clickToSelect": "Click a row to select in graph"
    }
  }
}
```

---

## Testing Recommendations

### 1. ImageNodeRenderer
- Test with various image formats (JPG, PNG, WebP)
- Test with broken URLs
- Test with different aspect ratios
- Test performance with many images

### 2. NodePropertiesPanel
- Test property addition
- Test property editing
- Test AI enrichment flow
- Test with nodes without images
- Test with very long property values

### 3. TableView
- Test sorting on all columns
- Test filtering by entity type
- Test search functionality
- Test row click to select node
- Test responsive behavior
- Test with large datasets (1000+ nodes)

---

## Performance Considerations

### Image Caching
- Images are cached to avoid repeated requests
- Consider implementing cache size limits
- Add cache invalidation strategy

### Table Virtualization
- For very large datasets (10,000+ nodes), consider adding virtualization
- Use `@tanstack/react-virtual` for row virtualization
- Implement pagination as an alternative

### Graph Rendering
- Custom node programs can impact performance
- Test with 500+ image nodes
- Consider LOD (Level of Detail) for distant nodes

---

## Future Enhancements

1. **Batch Operations**
   - Select multiple nodes in table
   - Batch edit properties
   - Batch AI enrichment

2. **Export Functionality**
   - Export table to CSV
   - Export filtered results
   - Export selected nodes

3. **Advanced Filtering**
   - Date range filters
   - Number range filters
   - Multi-select filters

4. **Image Upload**
   - Upload images for nodes
   - Drag and drop support
   - Image cropping/resizing

5. **Visualization Toggle**
   - Switch between graph and table views
   - Split view (side-by-side)
   - Synchronized selection

---

## Files Created

1. `/home/frankw/LightRAG/lightrag_webui/src/components/graph/ImageNodeRenderer.tsx`
2. `/home/frankw/LightRAG/lightrag_webui/src/components/graph/NodePropertiesPanel.tsx`
3. `/home/frankw/LightRAG/lightrag_webui/src/features/table/TableView.tsx`
4. `/home/frankw/LightRAG/lightrag_webui/src/features/table/index.ts`

---

## Dependencies Required

All dependencies are already in the project:
- `@tanstack/react-table`: ^8.21.3
- `react`: ^19.2.3
- `react-dom`: ^19.2.3
- `zustand`: ^5.0.9
- `lucide-react`: ^0.562.0
- `sigma`: ^3.0.2
- `@react-sigma/core`: ^5.0.6

---

## Conclusion

This design provides a comprehensive solution for:
1. Rendering image nodes in the knowledge graph
2. Enhanced property panels with AI enrichment
3. Tabular view with filtering and sorting

All components are designed to integrate seamlessly with the existing GraphViewer and use the established store architecture. The design prioritizes user experience, performance, and maintainability.
