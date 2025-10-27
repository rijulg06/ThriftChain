# ThriftChain

A decentralized marketplace built on Sui blockchain for peer-to-peer trading of thrift items with AI-powered personalization.

## Project Structure

```
ThriftChain/
├── frontend/          # Next.js frontend application
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   └── package.json  # Frontend dependencies
├── contracts/        # Sui Move smart contracts (to be added)
├── tasks/            # Development task lists
├── docs/             # Documentation
└── package.json      # Root workspace configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install frontend dependencies:
```bash
npm run install:frontend
# or
cd frontend && npm install
```

### Development

Run the development server from the root:

```bash
npm run dev
# or navigate to frontend directory
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Available Scripts

From the root directory:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

From the `frontend/` directory:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Features

### Wallet Integration
- **Suiet Wallet Kit**: Connect with Sui wallet extensions
- **zkLogin (Enoki)**: Passwordless authentication via Google OAuth
- Routes:
  - `GET /api/zklogin/enoki/start` - Initiate OAuth flow
  - `POST /api/zklogin/enoki/complete` - Complete authentication
  - `GET /auth/callback` - OAuth callback handler

### Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# Enoki (managed zkLogin)
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

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Blockchain**: Sui Network, @mysten/sui SDK
- **Wallet**: Suiet Wallet Kit, Enoki zkLogin
- **Storage**: Walrus
- **Database**: Supabase

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Sui Documentation](https://docs.sui.io/)
- [Supabase Documentation](https://supabase.com/docs)
- [ThriftChain PRD](./PRD_Final.md)

## Deployment

The frontend can be deployed to Vercel. See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying).

# Docs Repos
 - https://github.com/MystenLabs/sui
 - https://github.com/MystenLabs/move-book
 - https://github.com/MystenLabs/ts-sdks
 - https://github.com/MystenLabs/walrus-docs
