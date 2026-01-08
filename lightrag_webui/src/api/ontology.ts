/**
 * Ontology API Module
 * Handles all ontology-related API calls
 */

import axios from 'axios'
import { backendBaseUrl } from '@/lib/constants'
import type {
  OntologySpec,
  CreateOntologyDto,
  UpdateOntologyDto,
  ValidationResult
} from '@/types/ontology'

// Create axios instance for ontology API
const axiosInstance = axios.create({
  baseURL: backendBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('LIGHTRAG-API-TOKEN')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

/**
 * Get ontology by ID
 */
export const getOntology = async (ontologyId: string): Promise<OntologySpec> => {
  const response = await axiosInstance.get(`/ontology/${ontologyId}`)
  return response.data
}

/**
 * Get ontology by project ID
 */
export const getOntologyByProject = async (projectId: string): Promise<OntologySpec | null> => {
  try {
    const response = await axiosInstance.get(`/ontology/project/${projectId}`)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null
    }
    throw error
  }
}

/**
 * Create a new ontology
 */
export const createOntology = async (data: CreateOntologyDto): Promise<OntologySpec> => {
  const response = await axiosInstance.post('/ontology/create', data)
  return response.data
}

/**
 * Update an existing ontology
 */
export const updateOntology = async (
  ontologyId: string,
  data: UpdateOntologyDto
): Promise<void> => {
  await axiosInstance.put(`/ontology/${ontologyId}`, data)
}

/**
 * Delete an ontology
 */
export const deleteOntology = async (ontologyId: string): Promise<void> => {
  await axiosInstance.delete(`/ontology/${ontologyId}`)
}

/**
 * Validate an ontology
 */
export const validateOntology = async (ontologyId: string): Promise<ValidationResult> => {
  const response = await axiosInstance.get(`/ontology/${ontologyId}/validate`)
  return response.data
}

/**
 * Export ontology to JSON
 */
export const exportOntology = async (ontologyId: string): Promise<string> => {
  const response = await axiosInstance.get(`/ontology/${ontologyId}/export`, {
    responseType: 'text'
  })
  return JSON.stringify(response.data, null, 2)
}

/**
 * Import ontology from JSON
 */
export const importOntology = async (
  projectId: string,
  ontologyData: string
): Promise<OntologySpec> => {
  const data = JSON.parse(ontologyData)
  const response = await axiosInstance.post('/ontology/import', {
    project_id: projectId,
    ...data
  })
  return response.data
}
