'use client'

import React, { useEffect, useState } from 'react'
import mermaid from 'mermaid'

interface SchemaNode {
  id: string
  name: string
  type: 'global' | 'document'
  parent?: string
  properties: string[]
  jurisdiction?: string
  sourceCount?: number
}

interface SchemaMapping {
  localProperty: string
  globalProperty: string
  confidence: number
  documentId: string
}

interface SchemaVisualizationProps {
  schemas?: SchemaNode[]
  mappings?: SchemaMapping[]
  viewMode?: 'hierarchy' | 'mappings' | 'jurisdictions'
}

export default function SchemaVisualization({
  schemas = [],
  mappings = [],
  viewMode = 'hierarchy'
}: SchemaVisualizationProps) {
  const [mermaidCode, setMermaidCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'Arial, sans-serif'
    })
  }, [])

  useEffect(() => {
    generateMermaidDiagram()
  }, [schemas, mappings, viewMode])

  const generateMermaidDiagram = () => {
    setIsLoading(true)

    let diagram = ''

    switch (viewMode) {
      case 'hierarchy':
        diagram = generateHierarchyDiagram()
        break
      case 'mappings':
        diagram = generateMappingsDiagram()
        break
      case 'jurisdictions':
        diagram = generateJurisdictionsDiagram()
        break
      default:
        diagram = generateHierarchyDiagram()
    }

    setMermaidCode(diagram)
    setIsLoading(false)
  }

  const generateHierarchyDiagram = (): string => {
    if (schemas.length === 0) {
      return generateSampleHierarchy()
    }

    let diagram = 'graph TD\n'

    // Add global schemas
    const globalSchemas = schemas.filter(s => s.type === 'global')
    const documentSchemas = schemas.filter(s => s.type === 'document')

    // Create hierarchy
    globalSchemas.forEach(schema => {
      const nodeId = schema.id.replace(/-/g, '_')
      diagram += `    ${nodeId}["🔧 ${schema.name}\\n${schema.properties.length} properties\\n${schema.sourceCount || 0} sources"]\n`

      if (schema.parent) {
        const parentId = schema.parent.replace(/-/g, '_')
        diagram += `    ${parentId} --> ${nodeId}\n`
      }
    })

    // Add document schemas connected to global schemas
    documentSchemas.forEach(schema => {
      const nodeId = schema.id.replace(/-/g, '_')
      diagram += `    ${nodeId}["📄 ${schema.name}\\n${schema.jurisdiction}\\n${schema.properties.length} properties"]\n`

      if (schema.parent) {
        const parentId = schema.parent.replace(/-/g, '_')
        diagram += `    ${nodeId} -.-> ${parentId}\n`
      }
    })

    // Add styling
    diagram += `
    classDef globalSchema fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef documentSchema fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    `

    globalSchemas.forEach(schema => {
      diagram += `class ${schema.id.replace(/-/g, '_')} globalSchema\n`
    })

    documentSchemas.forEach(schema => {
      diagram += `class ${schema.id.replace(/-/g, '_')} documentSchema\n`
    })

    return diagram
  }

  const generateMappingsDiagram = (): string => {
    if (mappings.length === 0) {
      return generateSampleMappings()
    }

    let diagram = 'graph LR\n'

    // Group mappings by document
    const mappingsByDoc = mappings.reduce((acc, mapping) => {
      if (!acc[mapping.documentId]) {
        acc[mapping.documentId] = []
      }
      acc[mapping.documentId].push(mapping)
      return acc
    }, {} as Record<string, SchemaMapping[]>)

    Object.entries(mappingsByDoc).forEach(([docId, docMappings], docIndex) => {
      const docNodeId = `doc_${docIndex}`
      diagram += `    ${docNodeId}["📄 Document ${docIndex + 1}"]\n`

      docMappings.forEach((mapping, mappingIndex) => {
        const localNodeId = `local_${docIndex}_${mappingIndex}`
        const globalNodeId = `global_${mapping.globalProperty.replace(/[^a-zA-Z0-9]/g, '_')}`

        diagram += `    ${localNodeId}["${mapping.localProperty}"]\n`
        diagram += `    ${globalNodeId}["${mapping.globalProperty}"]\n`
        diagram += `    ${docNodeId} --> ${localNodeId}\n`
        diagram += `    ${localNodeId} -->|${(mapping.confidence * 100).toFixed(0)}%| ${globalNodeId}\n`
      })
    })

    return diagram
  }

  const generateJurisdictionsDiagram = (): string => {
    if (schemas.length === 0) {
      return generateSampleJurisdictions()
    }

    let diagram = 'graph TD\n'

    // Group schemas by jurisdiction
    const schemasByJurisdiction = schemas.reduce((acc, schema) => {
      const jurisdiction = schema.jurisdiction || 'Global'
      if (!acc[jurisdiction]) {
        acc[jurisdiction] = []
      }
      acc[jurisdiction].push(schema)
      return acc
    }, {} as Record<string, SchemaNode[]>)

    Object.entries(schemasByJurisdiction).forEach(([jurisdiction, jurisdictionSchemas]) => {
      const jurisdictionId = jurisdiction.replace(/[^a-zA-Z0-9]/g, '_')
      diagram += `    ${jurisdictionId}["🏛️ ${jurisdiction}\\n${jurisdictionSchemas.length} schemas"]\n`

      jurisdictionSchemas.forEach(schema => {
        const schemaId = schema.id.replace(/-/g, '_')
        diagram += `    ${schemaId}["${schema.name}\\n${schema.properties.length} properties"]\n`
        diagram += `    ${jurisdictionId} --> ${schemaId}\n`
      })
    })

    return diagram
  }

  const generateSampleHierarchy = (): string => {
    return `graph TD
    A["🔧 Utility Clearance Standards\\n15 properties\\n8 sources"]
    B["🔧 Vertical Clearance\\n5 properties\\n5 sources"]
    C["🔧 Horizontal Clearance\\n4 properties\\n4 sources"]
    D["🔧 Material Specifications\\n6 properties\\n3 sources"]

    E["📄 NYC Standards\\nNew York City\\n12 properties"]
    F["📄 SF Standards\\nSan Francisco\\n10 properties"]
    G["📄 LA Standards\\nLos Angeles\\n8 properties"]
    H["📄 TX Standards\\nTexas\\n14 properties"]

    A --> B
    A --> C
    A --> D

    E -.-> B
    E -.-> C
    F -.-> B
    F -.-> D
    G -.-> A
    H -.-> C
    H -.-> D

    classDef globalSchema fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef documentSchema fill:#f3e5f5,stroke:#4a148c,stroke-width:2px

    class A,B,C,D globalSchema
    class E,F,G,H documentSchema`
  }

  const generateSampleMappings = (): string => {
    return `graph LR
    A["📄 NYC Document"]
    B["📄 SF Document"]
    C["📄 LA Document"]

    A1["vertical_clearance_minimum"]
    A2["horizontal_clearance_gas"]
    A3["trench_backfill_material"]

    B1["separacion_vertical"]
    B2["clearance_horizontal"]
    B3["material_relleno"]

    C1["min_vertical_separation"]
    C2["lateral_spacing"]

    G1["🎯 vertical_clearance"]
    G2["🎯 horizontal_clearance"]
    G3["🎯 backfill_material"]

    A --> A1
    A --> A2
    A --> A3

    B --> B1
    B --> B2
    B --> B3

    C --> C1
    C --> C2

    A1 -->|95%| G1
    B1 -->|87%| G1
    C1 -->|92%| G1

    A2 -->|98%| G2
    B2 -->|89%| G2
    C2 -->|94%| G2

    A3 -->|85%| G3
    B3 -->|78%| G3`
  }

  const generateSampleJurisdictions = (): string => {
    return `graph TD
    US["🏛️ United States\\n15 schemas"]
    CA["🏛️ California\\n8 schemas"]
    TX["🏛️ Texas\\n5 schemas"]
    NY["🏛️ New York\\n4 schemas"]

    SF["San Francisco\\n3 properties"]
    LA["Los Angeles\\n4 properties"]
    SD["San Diego\\n2 properties"]

    NYC["New York City\\n5 properties"]
    BUF["Buffalo\\n3 properties"]

    HOU["Houston\\n4 properties"]
    DAL["Dallas\\n3 properties"]
    AUS["Austin\\n2 properties"]

    US --> CA
    US --> TX
    US --> NY

    CA --> SF
    CA --> LA
    CA --> SD

    NY --> NYC
    NY --> BUF

    TX --> HOU
    TX --> DAL
    TX --> AUS`
  }

  useEffect(() => {
    if (mermaidCode && !isLoading) {
      const renderDiagram = async () => {
        try {
          const element = document.getElementById('mermaid-diagram')
          if (element) {
            element.innerHTML = mermaidCode
            await mermaid.run({
              querySelector: '#mermaid-diagram'
            })
          }
        } catch (error) {
          console.error('Error rendering Mermaid diagram:', error)
        }
      }

      renderDiagram()
    }
  }, [mermaidCode, isLoading])

  return (
    <div className="w-full">
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => generateMermaidDiagram()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Refresh Diagram'}
        </button>

        <select
          value={viewMode}
          onChange={(e) => setMermaidCode('')}
          className="px-3 py-2 border rounded"
        >
          <option value="hierarchy">Schema Hierarchy</option>
          <option value="mappings">Property Mappings</option>
          <option value="jurisdictions">Jurisdictions</option>
        </select>
      </div>

      <div className="border rounded-lg p-4 bg-white overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Generating diagram...</div>
          </div>
        ) : (
          <div
            id="mermaid-diagram"
            className="w-full min-h-[400px] flex items-center justify-center"
          >
            {/* Mermaid diagram will be rendered here */}
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Legend:</strong></p>
        <p>🔧 Global Schema | 📄 Document Schema | 🎯 Unified Property | 🏛️ Jurisdiction</p>
        <p>Solid lines = inheritance | Dotted lines = mapping | Percentages = confidence scores</p>
      </div>
    </div>
  )
}