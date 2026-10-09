const NurseryDirectoryPage: React.FC = () => {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl font-bold text-green-800">
            Nursery Directory
          </h1>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 3v2h20v20a2 2 0 0 0 2-2H5a2 2 0 0 0-2-2V5a2 2 0 0 0-2-2H3m2.286 5.967l3.597 3.586m0 5.658l3.586-3.597m-2.286 2.286l-3.586 3.586m3.586-3.586l-3.597-3.586m5.958 2.286l3.586-3.586M9 12l2 2 4-4m6-8v12a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V9m16 4a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4v-2m4-6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2m3 0a2 2 0 0 0 2-2h2a2 2 0 0 0 2-2v-2m-6 0h6m-5-3a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
            </svg>
            <span className="text-sm text-gray-500">12 nurseries listed</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-flex flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Nursery A</h3>
                <p className="text-sm text-gray-500">Karachi</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              Specializing in native Pakistani plants and sustainable landscaping.
            </p>
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-green-600 font-medium">Verified: ✓</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Nursery B</h3>
                <p className="text-sm text-gray-500">Karachi</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              Focus on ornamental plants and seasonal varieties.
            </p>
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-gray-500 text-sm">Verification pending</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Nursery C</h3>
                <p className="text-sm text-gray-500">Karachi</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              Exporter of premium quality plants to international markets.
            </p>
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-green-600 font-medium">Verified: ✓</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NurseryDirectoryPage;