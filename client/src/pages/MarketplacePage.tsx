import mockPlants from '../../mock-data/mock-plants.json';

const MarketplacePage: React.FC = () => {
  return (
    <section className="py-20 bg-green-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl font-bold text-green-800">
            Plant Marketplace
          </h1>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 15l-5-5l-5 5l-3-3l5-5"></path>
            </svg>
            <span className="text-sm text-gray-500">Showing {mockPlants.length} available plants</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockPlants.map((plant) => (
            <div
              key={plant.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition-shadow"
            >
              <div className="aspect-w-1 aspect-h-1 bg-gray-100">
                <img
                  src={plant.image}
                  alt={plant.name}
                  className="w-full h-48 object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  {plant.name}
                </h3>
                <p className="text-green-600 text-sm mb-2">
                  {plant.species || 'Unknown species'}
                </p>
                <p className="text-gray-600 text-sm mb-3">
                  <strong>Quantity:</strong> {plant.availableQuantity} plants
                </p>
                <p className="text-gray-600 text-sm">
                  <strong>Price:</strong> PKR {plant.unitPrice}/plant
                </p>
                <button
                  className="w-full bg-green-600 text-white py-2 px-4 rounded mt-2 hover:bg-green-700 transition-colors"
                >
                  Request Quote
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MarketplacePage;