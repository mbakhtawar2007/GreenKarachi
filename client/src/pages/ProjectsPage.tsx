const ProjectsPage: React.FC = () => {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl font-bold text-green-800">
            Plantation Projects
          </h1>
          <button
            className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors text-sm"
          >
            Create New Project
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Project Card 1 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Neem Plantation 2024</h3>
                <p className="text-gray-600 text-sm">
                  500 neem trees targeted for Karachi metropolitan area.
                </p>
                <p className="text-gray-500 text-xs">
                  Needed by: December 2024
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-green-200">
              <div className="flex justify-between text-sm">
                <span>Donors: 12</span>
                <span>Pledges: 45%</span>
              </div>
            </div>
          </div>

          {/* Project Card 2 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 22s8-4 8-14V4s-8-4-8 14v8zm0-6a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"></path>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Roses for Karachi</h3>
                <p className="text-gray-600 text-sm">
                  10,000 rose bushes for citywide landscaping.
                </p>
                <p className="text-gray-500 text-xs">
                  Needed by: March 2025
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-green-200">
              <div className="flex justify-between text-sm">
                <span>Organizers: 5</span>
                <span>Progress: 30%</span>
              </div>
            </div>
          </div>

          {/* Project Card 3 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-5-3a2 2 0 0 0-3.46 l1.5 2.73L7.07 7l5 3a2 2 0 0 1 3.46 0l1.5-2.73L23 16a2 2 0 0 0 2-1.73l-5-3a2 2 0 0 0-3.46l1.5 2.73L13 16l5 3z"></path>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Urban Green Space</h3>
                <p className="text-gray-600 text-sm">
                  Creating community gardens across Karachi neighborhoods.
                </p>
                <p className="text-gray-500 text-xs">
                  Needed by: June 2025
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-green-200">
              <div className="flex justify-between text-sm">
                <span>Progress: 15%</span>
                <span>Volunteers: 28</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectsPage;