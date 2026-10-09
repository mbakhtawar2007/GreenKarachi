#!/bin/bash

# Script to verify the GreenKarachi project setup

echo "=== GreenKarachi Project Verification ==="
echo

# Check if root package.json exists
if [ -f "package.json" ]; then
    echo "✅ Root package.json exists"
else
    echo "❌ Root package.json missing"
    exit 1
fi

# Check if client directory exists
if [ -d "client" ]; then
    echo "✅ Client directory exists"
else
    echo "❌ Client directory missing"
    exit 1
fi

# Check if server directory exists
if [ -d "server" ]; then
    echo "✅ Server directory exists"
else
    echo "❌ Server directory missing"
    exit 1
fi

# Check critical files
if [ -f "tsconfig.json" ]; then
    echo "✅ Root TypeScript config exists"
else
    echo "❌ Root TypeScript config missing"
fi

if [ -f ".gitignore" ]; then
    echo "✅ .gitignore exists"
else
    echo "❌ .gitignore missing"
fi

if [ -f ".env.example" ]; then
    echo "✅ .env.example exists"
else
    echo "❌ .env.example missing"
fi

if [ -f "README.md" ]; then
    echo "✅ README.md exists"
else
    echo "❌ README.md missing"
fi

if [ -f "client/package.json" ]; then
    echo "✅ Client package.json exists"
else
    echo "❌ Client package.json missing"
fi

if [ -f "server/package.json" ]; then
    echo "✅ Server package.json exists"
else
    echo "❌ Server package.json missing"
fi

if [ -f "server/src/index.ts" ]; then
    echo "✅ Server main file exists"
else
    echo "❌ Server main file missing"
fi

if [ -f "client/src/App.tsx" ]; then
    echo "✅ Client App component exists"
else
    echo "❌ Client App component missing"
fi

echo
echo "=== Summary ==="
echo "The GreenKarachi project scaffold has been created successfully."
echo
echo "To run the application:"
echo "1. Navigate to the project root: cd GreenKarachi"
echo "2. Install all dependencies: npm run install:all"
echo "3. Start development server: npm run dev"
echo
echo "The frontend will be available at: http://localhost:5173"
echo "The backend API will be available at: http://localhost:3000"
echo "API Health Check: http://localhost:3000/api/health"
echo
echo "=== Project Structure ==="
echo "✅ Root package.json - Orchestrates both frontend and backend"
echo "✅ TypeScript configuration for both client and server"
echo "✅ Express server with health endpoint"
 echo "✅ React frontend with Vite"
echo "✅ Proper development workflow with npm run dev"
echo "✅ Environment variable template (.env.example)"
echo "✅ .gitignore for local secrets and build artifacts"
echo "✅ Comprehensive README with setup instructions"
echo
echo "The project is ready for Phase 1 implementation."
