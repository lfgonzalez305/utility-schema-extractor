'use client'

import React, { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, Search, Filter, Check, X, Eye, GitBranch } from 'lucide-react'
import clsx from 'clsx'

interface Property {
  id: string
  name: string
  type: string
  description?: string
  examples: any[]
  unit?: string
  constraints?: any
  frequency: number
  confidence: number
  sources: string[]
  mappedTo?: string[]
  status: 'pending' | 'approved' | 'rejected' | 'needs_review'
}

interface Schema {
  id: string
  name: string
  version: string
  jurisdiction: string
  type: 'document' | 'global'
  properties: Property[]
  parent?: string
  children?: string[]
}

interface PropertyExplorerProps {
  schemas?: Schema[]
  onPropertyUpdate?: (propertyId: string, updates: Partial<Property>) => void
  onSchemaSelect?: (schemaId: string) => void
}

export default function PropertyExplorer({
  schemas = [],
  onPropertyUpdate,
  onSchemaSelect
}: PropertyExplorerProps) {
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null)
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  // Sample data for demonstration
  const sampleSchemas: Schema[] = useMemo(() => [
    {
      id: 'global_clearance',
      name: 'Utility Clearance Standards',
      version: '2.1.0',
      jurisdiction: 'Global',
      type: 'global',
      properties: [
        {
          id: 'vertical_clearance',
          name: 'vertical_clearance',
          type: 'measurement',
          description: 'Minimum vertical separation between utilities',
          examples: ['36 inches', '91.44 cm', '3 feet'],
          unit: 'inches',
          constraints: { min: 24, max: 120 },
          frequency: 47,
          confidence: 0.95,
          sources: ['NYC', 'SF', 'LA', 'Chicago'],
          mappedTo: ['vertical_clearance_minimum', 'separacion_vertical', 'min_vertical_separation'],
          status: 'approved'
        },
        {
          id: 'horizontal_clearance',
          name: 'horizontal_clearance',
          type: 'measurement',
          description: 'Minimum horizontal separation between utilities',
          examples: ['12 inches', '30.48 cm', '1 foot'],
          unit: 'inches',
          frequency: 42,
          confidence: 0.91,
          sources: ['NYC', 'SF', 'Houston'],
          mappedTo: ['horizontal_clearance_gas', 'clearance_horizontal', 'lateral_spacing'],
          status: 'approved'
        },
        {
          id: 'backfill_material',
          name: 'backfill_material',
          type: 'enum',
          description: 'Required material for utility trench backfill',
          examples: ['Type A aggregate', 'grava clasificada', 'sand'],
          frequency: 31,
          confidence: 0.78,
          sources: ['NYC', 'SF', 'Austin'],
          mappedTo: ['trench_backfill_material', 'material_relleno'],
          status: 'needs_review'
        }
      ]
    },
    {
      id: 'nyc_001',
      name: 'NYC Utility Installation Standards',
      version: '1.0.0',
      jurisdiction: 'New York City',
      type: 'document',
      properties: [
        {
          id: 'vertical_clearance_minimum',
          name: 'vertical_clearance_minimum',
          type: 'string',
          description: 'Minimum vertical clearance requirement',
          examples: ['36 inches'],
          frequency: 1,
          confidence: 0.90,
          sources: ['NYC'],
          mappedTo: ['vertical_clearance'],
          status: 'approved'
        },
        {
          id: 'trench_backfill_material',
          name: 'trench_backfill_material',
          type: 'string',
          examples: ['Type A aggregate'],
          frequency: 1,
          confidence: 0.85,
          sources: ['NYC'],
          mappedTo: ['backfill_material'],
          status: 'approved'
        }
      ]
    },
    {
      id: 'sf_001',
      name: 'SF Public Works Utility Standards',
      version: '1.0.0',
      jurisdiction: 'San Francisco',
      type: 'document',
      properties: [
        {
          id: 'separacion_vertical',
          name: 'separacion_vertical',
          type: 'string',
          description: 'Separación vertical mínima',
          examples: ['91.44 cm'],
          frequency: 1,
          confidence: 0.87,
          sources: ['SF'],
          mappedTo: ['vertical_clearance'],
          status: 'needs_review'
        },
        {
          id: 'material_relleno',
          name: 'material_relleno',
          type: 'string',
          examples: ['grava clasificada'],
          frequency: 1,
          confidence: 0.78,
          sources: ['SF'],
          mappedTo: ['backfill_material'],
          status: 'pending'
        }
      ]
    }
  ], [])

  const currentSchemas = schemas.length > 0 ? schemas : sampleSchemas

  const filteredSchemas = useMemo(() => {
    return currentSchemas.filter(schema => {
      const matchesSearch = schema.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schema.properties.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))

      if (filterStatus === 'all') return matchesSearch

      return matchesSearch && schema.properties.some(p => p.status === filterStatus)
    })
  }, [currentSchemas, searchTerm, filterStatus])

  const toggleSchemaExpansion = (schemaId: string) => {
    const newExpanded = new Set(expandedSchemas)
    if (newExpanded.has(schemaId)) {
      newExpanded.delete(schemaId)
    } else {
      newExpanded.add(schemaId)
    }
    setExpandedSchemas(newExpanded)
  }

  const handlePropertyAction = (propertyId: string, action: 'approve' | 'reject') => {
    const property = currentSchemas
      .flatMap(s => s.properties)
      .find(p => p.id === propertyId)

    if (property && onPropertyUpdate) {
      onPropertyUpdate(propertyId, {
        status: action === 'approve' ? 'approved' : 'rejected'
      })
    }
  }

  const getStatusBadge = (status: Property['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      needs_review: 'bg-orange-100 text-orange-800 border-orange-200'
    }

    return (
      <span className={clsx('px-2 py-1 text-xs rounded-full border', styles[status])}>
        {status.replace('_', ' ')}
      </span>
    )
  }

  const getConfidenceBar = (confidence: number) => (
    <div className="w-16 bg-gray-200 rounded-full h-2">
      <div
        className={clsx('h-2 rounded-full', {
          'bg-red-400': confidence < 0.7,
          'bg-yellow-400': confidence >= 0.7 && confidence < 0.85,
          'bg-green-400': confidence >= 0.85
        })}
        style={{ width: `${confidence * 100}%` }}
      />
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Schema Tree */}
      <div className="w-1/2 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold mb-3">Schema Explorer</h2>

          {/* Search and Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search schemas and properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="needs_review">Needs Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Schema Tree */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredSchemas.map((schema) => (
            <div key={schema.id} className="mb-4">
              <div
                className={clsx(
                  'flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-100',
                  selectedSchema === schema.id && 'bg-blue-50 border border-blue-200'
                )}
                onClick={() => {
                  toggleSchemaExpansion(schema.id)
                  setSelectedSchema(schema.id)
                  onSchemaSelect?.(schema.id)
                }}
              >
                {expandedSchemas.has(schema.id) ?
                  <ChevronDown className="w-4 h-4" /> :
                  <ChevronRight className="w-4 h-4" />
                }
                <div className="flex items-center gap-2 flex-1">
                  {schema.type === 'global' ?
                    <GitBranch className="w-4 h-4 text-blue-500" /> :
                    <div className="w-4 h-4 bg-gray-300 rounded" />
                  }
                  <span className="font-medium">{schema.name}</span>
                  <span className="text-xs text-gray-500">v{schema.version}</span>
                </div>
                <span className="text-xs text-gray-400">{schema.properties.length} props</span>
              </div>

              {expandedSchemas.has(schema.id) && (
                <div className="ml-6 mt-2 space-y-1">
                  {schema.properties.map((property) => (
                    <div
                      key={property.id}
                      className={clsx(
                        'flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50',
                        selectedProperty?.id === property.id && 'bg-blue-50 border border-blue-200'
                      )}
                      onClick={() => setSelectedProperty(property)}
                    >
                      <span className="text-sm font-mono">{property.name}</span>
                      <div className="flex items-center gap-2 ml-auto">
                        {getStatusBadge(property.status)}
                        {getConfidenceBar(property.confidence)}
                        <span className="text-xs text-gray-400">{(property.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Property Details */}
      <div className="w-1/2 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Property Details</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {selectedProperty ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-mono font-semibold">{selectedProperty.name}</h3>
                  <p className="text-gray-600 mt-1">{selectedProperty.description || 'No description available'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePropertyAction(selectedProperty.id, 'approve')}
                    className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handlePropertyAction(selectedProperty.id, 'reject')}
                    className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>

              {/* Status and Confidence */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  {getStatusBadge(selectedProperty.status)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confidence</label>
                  <div className="flex items-center gap-2">
                    {getConfidenceBar(selectedProperty.confidence)}
                    <span className="text-sm">{(selectedProperty.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <span className="px-2 py-1 bg-gray-100 rounded text-sm">{selectedProperty.type}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <span className="text-sm">{selectedProperty.unit || 'N/A'}</span>
                </div>
              </div>

              {/* Examples */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Examples</label>
                <div className="space-y-1">
                  {selectedProperty.examples.map((example, index) => (
                    <div key={index} className="px-3 py-2 bg-gray-50 rounded font-mono text-sm">
                      {JSON.stringify(example)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mappings */}
              {selectedProperty.mappedTo && selectedProperty.mappedTo.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mapped To</label>
                  <div className="space-y-2">
                    {selectedProperty.mappedTo.map((mapping, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <span className="font-mono text-sm">{mapping}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sources ({selectedProperty.frequency} documents)</label>
                <div className="flex flex-wrap gap-2">
                  {selectedProperty.sources.map((source, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                      {source}
                    </span>
                  ))}
                </div>
              </div>

              {/* Constraints */}
              {selectedProperty.constraints && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Constraints</label>
                  <div className="p-3 bg-gray-50 rounded font-mono text-sm">
                    {JSON.stringify(selectedProperty.constraints, null, 2)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select a property to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}