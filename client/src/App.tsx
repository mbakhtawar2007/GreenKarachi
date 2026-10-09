import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-green-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-green-800">GreenKarachi</h1>
          <p className="text-green-600 mt-1">Connecting plant buyers and nursery owners in Karachi</p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome to GreenKarachi</h2>
          <p className="text-xl text-gray-600 mb-8">Building a sustainable plant marketplace for Karachi</p>
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-semibold mb-4">Project Status</h3>
            <p className="text-gray-600 mb-6">Phase 0 - Project Bootstrap Complete</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Frontend</h4>
                <p className="text-sm text-gray-600">React + Vite + TypeScript</p>
                <p className="text-sm text-green-600 mt-1">Status: ✅ Ready</p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Backend</h4>
                <p className="text-sm text-gray-600">Node.js + Express + TypeScript</p>
                <p className="text-sm text-green-600 mt-1">Status: ✅ Ready</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;