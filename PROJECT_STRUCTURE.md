# ThriftChain Project Structure

## Overview

ThriftChain has been refactored into a clean workspace structure with the frontend separated into its own directory. This allows for future expansion with additional modules like backend services, smart contracts, and shared libraries.

## Directory Structure

```
ThriftChain/
├── frontend/                    # Next.js frontend application
│   ├── src/                    # Source code
│   │   ├── app/                # Next.js app directory
│   │   │   ├── api/            # API routes
│   │   │   ├── auth/           # Authentication pages
│   │   │   └── ...             # Other pages
│   │   ├── components/         # React components
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   └── ...             # Custom components
│   │   └── lib/                # Utilities and helpers
│   ├── public/                 # Static assets
│   ├── .next/                  # Next.js build output (gitignored)
│   ├── node_modules/           # Frontend dependencies (gitignored)
│   ├── package.json            # Frontend dependencies
│   ├── tsconfig.json           # TypeScript config for frontend
│   ├── next.config.ts          # Next.js configuration
│   ├── postcss.config.mjs      # PostCSS configuration
│   └── components.json         # shadcn/ui configuration
│
├── contracts/                  # Sui Move smart contracts
│   ├── marketplace/
│   │   ├── sources/
│   │   │   └── thriftchain.move  # Main marketplace contract
│   │   └── Move.toml            # Move package configuration
│   └── README.md
│
├── tasks/                      # Development task lists
│   └── tasks-PRD_Final.md      # Task breakdown from PRD
│
├── docs/                       # Documentation
│   ├── move-book/              # Move language documentation
│   └── sui/                    # Sui blockchain documentation
│
├── node_modules/               # Root workspace dependencies
├── .gitignore                  # Git ignore rules
├── package.json                # Root workspace configuration
├── tsconfig.json               # Root TypeScript configuration
├── README.md                   # Main project README
├── PRD_Final.md                # Product Requirements Document
└── PROJECT_STRUCTURE.md        # This file
```

## Running the Application

### From Root Directory

```bash
# Install dependencies (will also install frontend deps)
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint
```

### From Frontend Directory

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint
```

## Key Files

### Root Level

- `package.json` - Workspace configuration with scripts to manage frontend
- `tsconfig.json` - Root TypeScript configuration
- `.gitignore` - Git ignore rules for both root and frontend
- `README.md` - Main project documentation
- `PRD_Final.md` - Product Requirements Document

### Frontend (`frontend/`)

- `package.json` - Frontend dependencies (React, Next.js, Sui SDK, etc.)
- `tsconfig.json` - Frontend-specific TypeScript configuration
- `next.config.ts` - Next.js configuration
- `components.json` - shadcn/ui component configuration

### Contracts (`contracts/`)

- `Move.toml` - Move package configuration for smart contracts
- `sources/thriftchain.move` - Main marketplace smart contract (to be created)

## Future Expansion

This structure supports future additions:

1. **Backend Services** (`backend/` or `services/`)
   - REST API
   - GraphQL API
   - Microservices

2. **Shared Libraries** (`packages/` or `libs/`)
   - Shared TypeScript types
   - Utility functions
   - Client SDKs

3. **Mobile App** (`mobile/`)
   - React Native app
   - Expo app

4. **CLI Tools** (`cli/`)
   - Deployment scripts
   - Migration tools
   - Development utilities

## Environment Variables

Create `.env.local` in the `frontend/` directory:

```env
# Enoki zkLogin
ENOKI_API_KEY=your_enoki_api_key
ENOKI_OAUTH_CLIENT_ID=your_google_oauth_client_id
NEXT_PUBLIC_ZKLOGIN_REDIRECT_URL=http://localhost:3000/auth/callback

# Supabase (to be added)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Sui Network
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://fullnode.testnet.sui.io:443
```

## Development Workflow

1. **Frontend Development**: Work in `frontend/` directory
2. **Smart Contracts**: Work in `contracts/` directory
3. **Documentation**: Update `README.md` or add to `docs/`
4. **Task Tracking**: Reference `tasks/tasks-PRD_Final.md`

## Git Workflow

The `.gitignore` is configured to ignore:
- `node_modules/` (both root and frontend)
- `.next/` (Next.js build output)
- `.env.local` (environment variables)
- IDE-specific files

## Deployment

- **Frontend**: Deploy `frontend/` directory to Vercel
- **Smart Contracts**: Deploy from `contracts/` using Sui CLI
- **Database**: Supabase (configured separately)
