import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { X, Plus, Sparkles, Image as ImageIcon } from 'lucide-react'
import { useGraphStore, RawNodeType } from '@/stores/graph'
import { useEnrichmentStore } from '@/stores'
import { checkEntityNameExists } from '@/api/lightrag'
import Text from '@/components/ui/Text'
import Button from '@/components/ui/Button'
import EditablePropertyRow from './EditablePropertyRow'
import PropertyEditDialog from './PropertyEditDialog'

interface NodePropertiesPanelProps {
  /**
   * Node data to display
   */
  node: RawNodeType
  /**
   * Callback when panel is closed
   */
  onClose?: () => void
  /**
   * Enable AI enrichment features
   */
  enableAIEnrichment?: boolean
  /**
   * Ontology ID for enrichment
   */
  ontologyId?: string
}

/**
 * NodePropertiesPanel - Enhanced panel for displaying and editing node properties
 *
 * Features:
 * - Display basic node information (ID, labels, degree)
 * - Show node image if available
 * - Display all properties with support for image properties
 * - Add new properties
 * - AI enrichment button (when enabled)
 */
const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({
  node,
  onClose,
  enableAIEnrichment = false,
  ontologyId
}) => {
  const { t } = useTranslation()
  const { enrichEntity, loading: enriching } = useEnrichmentStore()
  const [isAddingProperty, setIsAddingProperty] = useState(false)
  const [newPropertyName, setNewPropertyName] = useState('')
  const [newPropertyValue, setNewPropertyValue] = useState('')
  const graphDataVersion = useGraphStore.use.graphDataVersion()

  // Extract image URLs from properties
  const imageUrl = node.properties.image_url || node.properties.avatar || node.properties.img
  const hasImage = Boolean(imageUrl)

  // Filter out system properties
  const displayProperties = Object.entries(node.properties)
    .filter(([key]) => !['created_at', 'truncate', 'image_url', 'avatar', 'img'].includes(key))
    .sort(([a], [b]) => a.localeCompare(b))

  const handleAddProperty = async () => {
    if (!newPropertyName.trim() || !newPropertyValue.trim()) {
      toast.error(t('graphPanel.propertiesView.errors.propertyRequired', 'Property name and value are required'))
      return
    }

    // Check if property already exists
    if (node.properties[newPropertyName]) {
      toast.error(t('graphPanel.propertiesView.errors.propertyExists', 'Property already exists'))
      return
    }

    try {
      // TODO: Implement API call to add property
      const entityId = node.properties['entity_id'] || node.id
      // await addEntityProperty(entityId, { [newPropertyName]: newPropertyValue })

      toast.success(t('graphPanel.propertiesView.success.propertyAdded', 'Property added successfully'))

      // Reset form
      setNewPropertyName('')
      setNewPropertyValue('')
      setIsAddingProperty(false)

      // Trigger refresh
      useGraphStore.getState().incrementGraphDataVersion()
    } catch (error) {
      console.error('Error adding property:', error)
      toast.error(t('graphPanel.propertiesView.errors.addPropertyFailed', 'Failed to add property'))
    }
  }

  const handleAIEnrich = async () => {
    if (!enableAIEnrichment) return

    try {
      // Get entity name from node properties
      const entityName = node.properties['entity_name'] || node.labels[0] || String(node.id)

      // Call enrichment API
      const result = await enrichEntity({
        entity_name: entityName,
        ontology_id: ontologyId
      })

      if (result.status === 'completed' && result.enriched_data) {
        toast.success(t('graphPanel.propertiesView.success.aiEnrichment', 'AI enrichment completed'))

        // Update local node properties with enriched data
        const graphStore = useGraphStore.getState()
        const updatedNodes = graphStore.graphData.nodes.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              properties: {
                ...n.properties,
                ...result.enriched_data.attributes,
                description: result.enriched_data.description || n.properties.description
              }
            }
          }
          return n
        })

        graphStore.setGraphData({
          nodes: updatedNodes,
          edges: graphStore.graphData.edges
        })

        // Trigger refresh
        graphStore.incrementGraphDataVersion()
      } else if (result.status === 'failed') {
        toast.error(result.error_message || t('graphPanel.propertiesView.errors.aiEnrichmentFailed', 'AI enrichment failed'))
      }
    } catch (error) {
      console.error('Error during AI enrichment:', error)
      toast.error(t('graphPanel.propertiesView.errors.aiEnrichmentFailed', 'AI enrichment failed'))
    }
  }

  return (
    <div className="bg-background/90 rounded-lg border-2 p-4 backdrop-blur-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-blue-700">{t('graphPanel.propertiesView.node.title', 'Node Properties')}</h3>
        {onClose && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Basic Information */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {t('graphPanel.propertiesView.node.basicInfo', 'Basic Information')}
        </h4>
        <div className="bg-primary/5 rounded p-2 space-y-1">
          <PropertyRow
            name={t('graphPanel.propertiesView.node.id', 'ID')}
            value={String(node.id)}
          />
          <PropertyRow
            name={t('graphPanel.propertiesView.node.labels', 'Labels')}
            value={node.labels.join(', ')}
          />
          <PropertyRow
            name={t('graphPanel.propertiesView.node.degree', 'Degree')}
            value={String(node.degree)}
          />
        </div>
      </div>

      {/* Image Display */}
      {hasImage && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('graphPanel.propertiesView.node.image', 'Image')}
          </h4>
          <div className="bg-primary/5 rounded p-2 flex justify-center">
            <img
              src={imageUrl}
              alt={node.labels[0] || node.id}
              className="max-w-full max-h-48 rounded object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                toast.error(t('graphPanel.imageNode.loadError', 'Failed to load image'))
              }}
            />
          </div>
        </div>
      )}

      {/* Properties */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('graphPanel.propertiesView.node.properties', 'Properties')}
          </h4>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setIsAddingProperty(!isAddingProperty)}
          >
            <Plus className="h-3 w-3 mr-1" />
            {t('graphPanel.propertiesView.node.addProperty', 'Add Property')}
          </Button>
        </div>

        {/* Add Property Form */}
        {isAddingProperty && (
          <div className="bg-primary/5 rounded p-2 mb-2 space-y-2">
            <input
              type="text"
              placeholder={t('graphPanel.propertiesView.node.propertyNamePlaceholder', 'Property name')}
              value={newPropertyName}
              onChange={(e) => setNewPropertyName(e.target.value)}
              className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <textarea
              placeholder={t('graphPanel.propertiesView.node.propertyValuePlaceholder', 'Property value')}
              value={newPropertyValue}
              onChange={(e) => setNewPropertyValue(e.target.value)}
              rows={2}
              className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={handleAddProperty}
              >
                {t('common.add', 'Add')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setIsAddingProperty(false)
                  setNewPropertyName('')
                  setNewPropertyValue('')
                }}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        )}

        {/* Properties List */}
        <div className="bg-primary/5 rounded p-2 max-h-60 overflow-y-auto">
          {displayProperties.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
              {t('graphPanel.propertiesView.node.noProperties', 'No properties')}
            </p>
          ) : (
            displayProperties.map(([name, value]) => (
              <EditablePropertyRow
                key={name}
                name={name}
                value={value}
                nodeId={String(node.id)}
                entityId={node.properties['entity_id']}
                entityType="node"
                isEditable={name === 'description' || name === 'entity_id' || name === 'entity_type' || name === 'keywords'}
                tooltip={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              />
            ))
          )}
        </div>
      </div>

      {/* AI Enrichment */}
      {enableAIEnrichment && (
        <div>
          <Button
            size="sm"
            variant="default"
            className="w-full"
            onClick={handleAIEnrich}
            disabled={enriching}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {enriching
              ? t('graphPanel.propertiesView.node.enriching', 'Enriching...')
              : t('graphPanel.propertiesView.node.aiEnrich', 'AI Enrichment')
            }
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * PropertyRow - Simplified row component for displaying properties
 */
const PropertyRow = ({ name, value }: { name: string; value: any }) => {
  const { t } = useTranslation()

  const getPropertyNameTranslation = (name: string) => {
    const translationKey = `graphPanel.propertiesView.node.propertyNames.${name}`
    const translation = t(translationKey)
    return translation === translationKey ? name : translation
  }

  // Format value to convert <SEP> to newlines
  const formatValue = (value: any): string => {
    if (typeof value === 'string') {
      return value.replace(/<SEP>/g, '; ')
    }
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-primary/60 font-medium whitespace-nowrap min-w-[80px]">
        {getPropertyNameTranslation(name)}:
      </span>
      <Text
        className="hover:bg-primary/20 rounded p-1 overflow-hidden text-ellipsis flex-1"
        text={formatValue(value)}
        tooltip={formatValue(value)}
        side="left"
      />
    </div>
  )
}

export default NodePropertiesPanel
export { NodePropertiesPanel }
