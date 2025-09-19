'use client'

import React, { useState } from 'react'
import { ExternalLink, Database, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface DashboardResponse {
  dashboard_url: string
  spreadsheet_id: string
  properties_count: number
  mappings_count: number
  message: string
}

export default function RowsIntegrationPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [options, setOptions] = useState({
    include_properties: true,
    include_mappings: true,
    confidence_threshold: 0.7,
    status_filter: null
  })

  const createRowsDashboard = async () => {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/rows/create-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          include_properties: options.include_properties,
          include_mappings: options.include_mappings,
          confidence_threshold: options.confidence_threshold > 0 ? options.confidence_threshold : null,
          status_filter: options.status_filter
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create dashboard')
      }

      const data: DashboardResponse = await response.json()
      setDashboardUrl(data.dashboard_url)
      setStats(data)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Rows.com Schema Validation
            </h1>
            <p className="text-gray-600">
              Create a powerful spreadsheet-based validation dashboard for schema properties and mappings.
              Much more practical than custom UI for human validation workflows.
            </p>
          </div>

          {/* Configuration Options */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Dashboard Configuration</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.include_properties}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      include_properties: e.target.checked
                    }))}
                    className="rounded border-gray-300"
                  />
                  <span>Include Properties Sheet</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.include_mappings}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      include_mappings: e.target.checked
                    }))}
                    className="rounded border-gray-300"
                  />
                  <span>Include Mappings Sheet</span>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Confidence Threshold
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={options.confidence_threshold}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      confidence_threshold: parseFloat(e.target.value)
                    }))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-500">
                    {(options.confidence_threshold * 100).toFixed(0)}% confidence
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Create Dashboard Button */}
          <div className="mb-6">
            <button
              onClick={createRowsDashboard}
              disabled={isCreating || (!options.include_properties && !options.include_mappings)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Dashboard...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" />
                  Create Rows Dashboard
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          {/* Success Display */}
          {dashboardUrl && stats && (
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 mb-4">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Dashboard Created Successfully!</span>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.properties_count}</div>
                  <div className="text-sm text-gray-600">Properties</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.mappings_count}</div>
                  <div className="text-sm text-gray-600">Mappings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">100%</div>
                  <div className="text-sm text-gray-600">Ready for Validation</div>
                </div>
              </div>

              <a
                href={dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <ExternalLink className="w-4 h-4" />
                Open Validation Dashboard
              </a>

              <p className="text-sm text-gray-600 mt-3">
                {stats.message}
              </p>
            </div>
          )}

          {/* Features Section */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4">Why Rows.com for Schema Validation?</h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">🔍 Property Explorer</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Sortable, filterable property table</li>
                  <li>• Confidence scores and examples</li>
                  <li>• Bulk approve/reject actions</li>
                  <li>• Notes and validation status</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">🔄 Mapping Validation</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Side-by-side property comparison</li>
                  <li>• Transformation rules preview</li>
                  <li>• Conflict detection and resolution</li>
                  <li>• Jurisdiction-based organization</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">🐍 Python Integration</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Custom validation functions</li>
                  <li>• Automated confidence scoring</li>
                  <li>• Data transformation scripts</li>
                  <li>• Integration with ML models</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">🗄️ Postgres Backend</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Direct database queries</li>
                  <li>• Real-time sync capabilities</li>
                  <li>• Advanced analytics and reporting</li>
                  <li>• Scalable data processing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}