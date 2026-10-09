const HomePage: React.FC = () => {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-green-800 mb-6">
            Connecting Plant Buyers & Nursery Owners
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            A responsive B2B marketplace that connects plant buyers, nursery owners, 
            businesses, plantation organizers, donors, and investors in Karachi, Pakistan.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 transform hover:translate-y-2 transition-transform">
              <div className="text-4xl text-green-500 mb-4">🌱</div>
              <h3 className="text-xl font-semibold mb-2">Browse Plants</h3>
              <p className="text-gray-600">
                Explore available plants from nurseries across Karachi.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 transform hover:translate-y-2 transition-transform">
              <div className="text-4xl text-green-500 mb-4">🤝</div>
              <h3 className="text-xl font-semibold mb-2">Nursery Collaboration</h3>
              <p className="text-gray-600">
                Create supply-gap requests and coordinate with other nurseries.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 transform hover:translate-y-2 transition-transform">
              <div className="text-4xl text-green-500 mb-4">💚</div>
              <h3 className="text-xl font-semibold mb-2">Plantation Projects</h3>
              <p className="text-gray-600">
                Organize and support plantation projects with donors and investors.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomePage;