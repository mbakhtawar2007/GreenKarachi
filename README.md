# GreenKarachi

A responsive B2B marketplace that connects plant buyers, nursery owners, businesses, plantation organizers, donors, and investors in Karachi, Pakistan.

## Project Overview

GreenKarachi is more than an online plant catalog. Its core differentiator is **nursery-to-nursery collaboration**: if Nursery A needs 100 plants but has only 60, it can create a supply-gap request for the remaining 40. Other nurseries can offer available stock, and the requester can review offers and coordinate fulfillment.

## Quick Start (Windows PowerShell)

### Prerequisites

1. **Install Node.js**
   ```powershell
   # Download from https://nodejs.org/
   # Or using winget:
   winget install OpenJS.NodeJS
   ```

2. **Verify Installation**
   ```powershell
   node --version
   npm --version
   git --version
   ```

### Clone and Setup

```powershell
# Clone the repository (if available)
# git clone https://github.com/your-repo/greenkarachi.git
# cd greenkarachi

# If running from existing directory, ensure you have the project files:
# - AGENTS.md
# - GREENKARACHI_BUILD_PHASES.md
# - Other starter files

# Navigate to project directory
# Set-Location C:\path\to\GreenKarachi

# Install all dependencies
npm run install:all
```

### Run Development Server

```powershell
# Start both frontend and backend simultaneously
npm run dev

# This will run:
# - Frontend: React + Vite (usually on port 5173)
# - Backend: Node.js + Express (usually on port 3000)
```

### Check Build Status

```powershell
# Type check both frontend and backend
npm run check

# Build for production
npm run build
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## Project Structure

```
greenkarachi/
├── client/
│   ├── package.json
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.tsx
│   └── index.html
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── api/
│   │   │   └── health.ts
│   │   ├── models/
│   │   ├── services/
│   │   └── types.ts
│   └── index.ts
├── .gitignore
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run install:all` | Install dependencies for both client and server |
| `npm run build` | Build both frontend and backend for production |
| `npm run check` | Run type checks on both frontend and backend |

## Phase-Based Development

This project is developed in phases using the OpenCode framework:

1. **Phase 0**: Bootstrap the project scaffold
2. **Phase 1**: Project foundation and visual shell
3. **Phase 2**: Database, authentication, user roles, and profiles
4. **Phase 3**: Nursery catalog and inventory management
5. **Phase 4**: Quotations and basic order lifecycle
6. **Phase 5**: Nursery-to-nursery supply-gap collaboration
7. **Phase 6**: Plantation projects and donor/investor interest
8. **Phase 7**: Admin operations, verification, moderation, and audit trail
9. **Phase 8**: Conversations, notifications, and workflow polish
10. **Phase 9**: Release readiness, security review, deployment, and documentation

To start a specific phase, run:
```powershell
opencode "Start Phase X from GREENKARACHI_BUILD_PHASES.md"
```

## Technology Stack

### Frontend
- React + TypeScript + Vite
- React Router
- Tailwind CSS

### Backend
- Node.js + TypeScript + Express
- PostgreSQL (Phase 2+)
- Zod for validation

### Development
- Git for version control
- Concurrently for orchestrating frontend/backend
- TypeScript for type safety

## Environment Variables

Copy `.env.example` to `.env` and fill in your local development values:

```
SERVER_PORT=3000
CORS_ORIGIN=http://localhost:5173
# ... other variables
```

## Important Notes

- This is a greenfield project being developed in phases
- PostgreSQL database setup is deferred until Phase 2
- No payment processing or integrated online services are included in the initial release
- Each phase must complete before starting the next one
- Business logic and API endpoints are implemented incrementally

## Support

For issues with project setup or running commands, refer to the START_HERE.md file or contact the development team.
# GreenKarachi
