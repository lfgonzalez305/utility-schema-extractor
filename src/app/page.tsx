import SchemaVisualization from '@/components/SchemaVisualization'

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">
          Utility Schema Extractor
        </h1>
        <p className="text-lg text-gray-600 mb-8 text-center">
          Iterative schema extraction and refinement system for utility engineering specifications across global jurisdictions
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">🔗 Integration Bridge</h2>
            <p className="text-gray-600 mb-4">
              Seamlessly connects with the raw data collection system to ingest documents and extract schemas.
            </p>
            <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
              View API Status
            </button>
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">📊 Schema Analytics</h2>
            <p className="text-gray-600 mb-4">
              Analyze property mappings, jurisdiction coverage, and schema evolution metrics.
            </p>
            <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              View Analytics
            </button>
          </div>
        </div>

        <div className="border rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">🎯 Schema Hierarchy Visualization</h2>
          <p className="text-gray-600 mb-6">
            Interactive visualization of schema relationships, property mappings, and jurisdiction hierarchies.
            Clear traceability from local document schemas to global unified schemas.
          </p>
          <SchemaVisualization />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">🌍 Global Coverage</h3>
            <p className="text-gray-600 text-sm mb-3">
              Tracks schemas across jurisdictions worldwide with semantic alignment.
            </p>
            <div className="text-2xl font-bold text-blue-600">15+</div>
            <div className="text-sm text-gray-500">Jurisdictions</div>
          </div>

          <div className="border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">🔄 Active Mappings</h3>
            <p className="text-gray-600 text-sm mb-3">
              Property mappings between local and global schemas with confidence scores.
            </p>
            <div className="text-2xl font-bold text-green-600">127</div>
            <div className="text-sm text-gray-500">Mappings</div>
          </div>

          <div className="border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">📈 Schema Evolution</h3>
            <p className="text-gray-600 text-sm mb-3">
              Inheritance hierarchy with polymorphism support for complex relationships.
            </p>
            <div className="text-2xl font-bold text-purple-600">89%</div>
            <div className="text-sm text-gray-500">Alignment Accuracy</div>
          </div>
        </div>
      </div>
    </main>
  )
}