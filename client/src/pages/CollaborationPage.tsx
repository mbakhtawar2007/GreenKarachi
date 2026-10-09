const CollaborationPage: React.FC = () => {
  return (
    <section className="py-20 bg-green-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl font-bold text-green-800">
            Nursery Collaboration
          </h1>
          <p className="text-lg text-gray-600">
            Connect with other nurseries to fulfill supply gaps and coordinate stock.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Supply Gap Request Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Supply Gap Request</h3>
                <p className="text-sm text-gray-500">Request additional stock from other nurseries</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-green-600 font-medium">Create Request</p>
            </div>
          </div>

          {/* Offers Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M13 2L3 14h9l-1 8 13-6 1 8h9l-1-8z"></path>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Supplier Offers</h3>
                <p className="text-sm text-gray-500">Receive and review offers from other nurseries</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-green-600 font-medium">View Offers</p>
            </div>
          </div>

          {/* Request Status Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Request Status</h3>
                <p className="text-sm text-gray-500">Track your requests and offers</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-green-600 font-medium">Active: 3</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CollaborationPage;