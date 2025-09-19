export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">
          Utility Schema Extractor
        </h1>
        <p className="text-lg text-gray-600 mb-8 text-center">
          Iterative schema extraction and refinement system for utility engineering specifications across global jurisdictions
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Document Upload</h2>
            <p className="text-gray-600 mb-4">
              Upload utility engineering specifications to extract structured data and generate schemas.
            </p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Upload Document
            </button>
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Schema Visualization</h2>
            <p className="text-gray-600 mb-4">
              Explore the hierarchy of extracted schemas and their relationships across jurisdictions.
            </p>
            <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              View Schemas
            </button>
          </div>
        </div>

        <div className="mt-8 border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
          <p className="text-gray-600">
            No documents processed yet. Upload your first specification document to get started.
          </p>
        </div>
      </div>
    </main>
  )
}