/**
 * Attributes feature module
 *
 * Exports all components and types for entity attribute management
 */

// Components
export { default as AttributeEditDialog } from './AttributeEditDialog'
export { default as LLMEnrichmentPanel } from './LLMEnrichmentPanel'
export { default as PromptTemplateSelector } from './PromptTemplateSelector'

// Types (re-export from types/enrichment.ts for convenience)
export type {
  EnrichmentStatus,
  EnrichmentModelType,
  EnrichmentResult,
  BatchEnrichmentResult,
  EntityData,
  EnrichmentRequest,
  BatchEnrichmentRequest,
  EnrichmentStatusResponse,
  PromptTemplate,
  TemplateVariable,
  CustomPrompt,
  AttributeGenerationConfig,
  GenerationResult,
  TemplateVariableValues,
  ModelConfig
} from '@/types/enrichment'

// API functions
export {
  enrichmentApi,
  generateAttributeValue,
  generateWithEnrichmentAPI,
  updateEntityAttributes,
  deleteEntityAttribute
} from '@/api/enrichment'
