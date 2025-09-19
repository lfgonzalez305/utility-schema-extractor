'use client'

import React, { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Folder, GitMerge, BarChart3, Settings } from 'lucide-react'
import PropertyExplorer from './PropertyExplorer'
import MappingValidationDashboard from './MappingValidationDashboard'
import SchemaVisualization from './SchemaVisualization'

interface SchemaWorkbenchProps {
  schemas?: any[]
  mappings?: any[]
  onPropertyUpdate?: (propertyId: string, updates: any) => void
  onMappingUpdate?: (mappingId: string, updates: any) => void
  onBulkUpdate?: (mappingIds: string[], updates: any) => void
}

export default function SchemaWorkbench({
  schemas = [],
  mappings = [],
  onPropertyUpdate,
  onMappingUpdate,
  onBulkUpdate
}: SchemaWorkbenchProps) {
  const [activeTab, setActiveTab] = useState('explorer')
  const [stats] = useState({
    totalSchemas: 15,
    totalProperties: 127,
    pendingMappings: 23,
    conflicts: 5,
    approved: 89
  })

  return (
    <div className="h-screen bg-gray-50">
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        {/* Header with Stats */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Schema Workbench</h1>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>{stats.totalSchemas} Schemas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>{stats.totalProperties} Properties</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>{stats.pendingMappings} Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>{stats.conflicts} Conflicts</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <Tabs.List className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <Tabs.Trigger
              value="explorer"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
            >
              <Folder className="w-4 h-4" />
              Property Explorer
            </Tabs.Trigger>
            <Tabs.Trigger
              value="validation"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
            >
              <GitMerge className="w-4 h-4" />
              Mapping Validation
              {stats.pendingMappings > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  {stats.pendingMappings}
                </span>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger
              value="overview"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
            >
              <BarChart3 className="w-4 h-4" />
              Schema Overview
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs.Content value="explorer" className="h-full">
            <PropertyExplorer
              schemas={schemas}
              onPropertyUpdate={onPropertyUpdate}
            />
          </Tabs.Content>

          <Tabs.Content value="validation" className="h-full">
            <MappingValidationDashboard
              mappings={mappings}
              onMappingUpdate={onMappingUpdate}
              onBulkUpdate={onBulkUpdate}
            />
          </Tabs.Content>

          <Tabs.Content value="overview" className="h-full">
            <div className="h-full p-6">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-xl font-semibold mb-4">Schema Relationship Overview</h2>
                <p className="text-gray-600 mb-6">
                  Interactive visualization of schema hierarchies, property mappings, and jurisdiction relationships.
                </p>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <SchemaVisualization
                    schemas={schemas}
                    mappings={mappings}
                    viewMode="hierarchy"
                  />
                </div>
              </div>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  )
}