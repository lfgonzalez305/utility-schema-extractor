'use client'

import React, { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef
} from '@tanstack/react-table'
import { Search, Filter, Check, X, Eye, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react'
import clsx from 'clsx'

interface MappingEntry {
  id: string
  localProperty: string
  globalProperty: string
  localSchema: string
  jurisdiction: string
  confidence: number
  status: 'pending' | 'approved' | 'rejected' | 'conflict'
  examples: {
    local: any[]
    global: any[]
  }
  transformationRules?: {
    unitConversion?: { factor: number; offset: number }
    normalization?: string[]
  }
  conflictReason?: string
  lastModified: string
  reviewedBy?: string
}

interface MappingValidationDashboardProps {
  mappings?: MappingEntry[]
  onMappingUpdate?: (mappingId: string, updates: Partial<MappingEntry>) => void
  onBulkUpdate?: (mappingIds: string[], updates: Partial<MappingEntry>) => void
}

const columnHelper = createColumnHelper<MappingEntry>()

export default function MappingValidationDashboard({
  mappings = [],
  onMappingUpdate,
  onBulkUpdate
}: MappingValidationDashboardProps) {
  const [selectedMappings, setSelectedMappings] = useState<Set<string>>(new Set())
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedMapping, setSelectedMapping] = useState<MappingEntry | null>(null)

  // Sample data for demonstration
  const sampleMappings: MappingEntry[] = useMemo(() => [
    {
      id: 'map_001',
      localProperty: 'vertical_clearance_minimum',
      globalProperty: 'vertical_clearance',
      localSchema: 'NYC Utility Standards',
      jurisdiction: 'New York City',
      confidence: 0.95,
      status: 'approved',
      examples: {
        local: ['36 inches', '42 inches'],
        global: ['36 inches', '42 inches', '91.44 cm']
      },
      transformationRules: {
        unitConversion: { factor: 1, offset: 0 }
      },
      lastModified: '2024-01-15T10:30:00Z',
      reviewedBy: 'john.doe@company.com'
    },
    {
      id: 'map_002',
      localProperty: 'separacion_vertical',
      globalProperty: 'vertical_clearance',
      localSchema: 'SF Public Works Standards',
      jurisdiction: 'San Francisco',
      confidence: 0.87,
      status: 'pending',
      examples: {
        local: ['91.44 cm', '106.68 cm'],
        global: ['36 inches', '42 inches']
      },
      transformationRules: {
        unitConversion: { factor: 0.393701, offset: 0 }
      },
      lastModified: '2024-01-16T14:22:00Z'
    },
    {
      id: 'map_003',
      localProperty: 'material_relleno',
      globalProperty: 'backfill_material',
      localSchema: 'SF Public Works Standards',
      jurisdiction: 'San Francisco',
      confidence: 0.78,
      status: 'conflict',
      examples: {
        local: ['grava clasificada', 'arena'],
        global: ['Type A aggregate', 'sand', 'gravel']
      },
      conflictReason: 'Multiple possible mappings detected',
      lastModified: '2024-01-16T16:45:00Z'
    },
    {
      id: 'map_004',
      localProperty: 'lateral_spacing',
      globalProperty: 'horizontal_clearance',
      localSchema: 'LA Municipal Code',
      jurisdiction: 'Los Angeles',
      confidence: 0.92,
      status: 'approved',
      examples: {
        local: ['1 foot', '18 inches'],
        global: ['12 inches', '18 inches']
      },
      lastModified: '2024-01-17T09:15:00Z',
      reviewedBy: 'jane.smith@company.com'
    },
    {
      id: 'map_005',
      localProperty: 'min_cover_depth',
      globalProperty: 'cover_depth',
      localSchema: 'Texas DOT Standards',
      jurisdiction: 'Texas',
      confidence: 0.89,
      status: 'pending',
      examples: {
        local: ['30 inches', '36 inches'],
        global: ['30 inches', '36 inches', '76.2 cm']
      },
      lastModified: '2024-01-17T11:30:00Z'
    }
  ], [])

  const currentMappings = mappings.length > 0 ? mappings : sampleMappings

  const columns: ColumnDef<MappingEntry, any>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }: { table: any }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="rounded border-gray-300"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="rounded border-gray-300"
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    columnHelper.accessor('localProperty', {
      header: 'Local Property',
      cell: (info) => (
        <div className="font-mono text-sm">
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('globalProperty', {
      header: 'Global Property',
      cell: (info) => (
        <div className="font-mono text-sm text-blue-600">
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('jurisdiction', {
      header: 'Jurisdiction',
      cell: (info) => (
        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('confidence', {
      header: 'Confidence',
      cell: (info) => {
        const confidence = info.getValue()
        return (
          <div className="flex items-center gap-2">
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
            <span className="text-xs">{(confidence * 100).toFixed(0)}%</span>
          </div>
        )
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const status = info.getValue()
        const styles = {
          pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          approved: 'bg-green-100 text-green-800 border-green-200',
          rejected: 'bg-red-100 text-red-800 border-red-200',
          conflict: 'bg-orange-100 text-orange-800 border-orange-200'
        }
        return (
          <span className={clsx('px-2 py-1 text-xs rounded-full border', styles[status as keyof typeof styles])}>
            {status}
          </span>
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleMappingAction(row.original.id, 'approve')}
            className="p-1 text-green-600 hover:bg-green-100 rounded"
            title="Approve"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleMappingAction(row.original.id, 'reject')}
            className="p-1 text-red-600 hover:bg-red-100 rounded"
            title="Reject"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedMapping(row.original)}
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    }),
  ], [])

  const filteredData = useMemo(() => {
    return currentMappings.filter(mapping => {
      const matchesSearch = globalFilter === '' ||
        mapping.localProperty.toLowerCase().includes(globalFilter.toLowerCase()) ||
        mapping.globalProperty.toLowerCase().includes(globalFilter.toLowerCase()) ||
        mapping.jurisdiction.toLowerCase().includes(globalFilter.toLowerCase())

      const matchesStatus = statusFilter === 'all' || mapping.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [currentMappings, globalFilter, statusFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function'
        ? updater(Object.fromEntries(Array.from(selectedMappings).map(id => [id, true])))
        : updater
      setSelectedMappings(new Set(Object.keys(newSelection).filter(key => newSelection[key])))
    },
  })

  const handleMappingAction = (mappingId: string, action: 'approve' | 'reject') => {
    if (onMappingUpdate) {
      onMappingUpdate(mappingId, {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: 'current.user@company.com',
        lastModified: new Date().toISOString()
      })
    }
  }

  const handleBulkAction = (action: 'approve' | 'reject') => {
    if (onBulkUpdate && selectedMappings.size > 0) {
      onBulkUpdate(Array.from(selectedMappings), {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: 'current.user@company.com',
        lastModified: new Date().toISOString()
      })
      setSelectedMappings(new Set())
    }
  }

  const getStatusCounts = () => {
    return currentMappings.reduce((acc, mapping) => {
      acc[mapping.status] = (acc[mapping.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Table View */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Mapping Validation Dashboard</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                Pending: {statusCounts.pending || 0}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                Conflicts: {statusCounts.conflict || 0}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                Approved: {statusCounts.approved || 0}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search mappings..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-80"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="conflict">Conflicts</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {selectedMappings.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedMappings.size} selected
                </span>
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  <Check className="w-4 h-4" />
                  Approve All
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  <X className="w-4 h-4" />
                  Reject All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-200">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={clsx(
                    'hover:bg-gray-50',
                    row.getIsSelected() && 'bg-blue-50'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedMapping && (
        <div className="w-96 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Mapping Details</h3>
            <button
              onClick={() => setSelectedMapping(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Properties */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Property Mapping</label>
              <div className="space-y-2">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Local Property</div>
                  <div className="font-mono">{selectedMapping.localProperty}</div>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <div className="text-xs text-gray-500">Global Property</div>
                  <div className="font-mono text-blue-600">{selectedMapping.globalProperty}</div>
                </div>
              </div>
            </div>

            {/* Examples Comparison */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Value Examples</label>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Local Examples</div>
                  {selectedMapping.examples.local.map((example, index) => (
                    <div key={index} className="text-sm font-mono bg-gray-50 p-1 rounded mb-1">
                      {JSON.stringify(example)}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Global Examples</div>
                  {selectedMapping.examples.global.map((example, index) => (
                    <div key={index} className="text-sm font-mono bg-blue-50 p-1 rounded mb-1">
                      {JSON.stringify(example)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Transformation Rules */}
            {selectedMapping.transformationRules && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transformation Rules</label>
                <div className="p-3 bg-gray-50 rounded font-mono text-sm">
                  {JSON.stringify(selectedMapping.transformationRules, null, 2)}
                </div>
              </div>
            )}

            {/* Conflict Reason */}
            {selectedMapping.conflictReason && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conflict Reason</label>
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                  {selectedMapping.conflictReason}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Confidence:</span>
                <span className="ml-2">{(selectedMapping.confidence * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-gray-500">Last Modified:</span>
                <span className="ml-2">{new Date(selectedMapping.lastModified).toLocaleString()}</span>
              </div>
              {selectedMapping.reviewedBy && (
                <div>
                  <span className="text-gray-500">Reviewed By:</span>
                  <span className="ml-2">{selectedMapping.reviewedBy}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  handleMappingAction(selectedMapping.id, 'approve')
                  setSelectedMapping(null)
                }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => {
                  handleMappingAction(selectedMapping.id, 'reject')
                  setSelectedMapping(null)
                }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}