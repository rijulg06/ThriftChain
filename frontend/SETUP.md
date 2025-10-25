# ThriftChain Frontend Setup Guide

## Environment Variables Setup

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project Name**: thriftchain (or your preferred name)
   - **Database Password**: Choose a strong password (save it securely)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait 2-3 minutes for the project to initialize

### Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:

#### Project URL
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
```

#### anon/public key
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### service_role key (keep this secret!)
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Important**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (RLS). Never expose it publicly!

### Step 3: Create `.env.local` File

Create a `.env.local` file in the `frontend/` directory with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_actual_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here

# Enoki (managed zkLogin) - if you have these
ENOKI_API_KEY=your_enoki_api_key
ENOKI_OAUTH_CLIENT_ID=your_google_oauth_client_id
NEXT_PUBLIC_ZKLOGIN_REDIRECT_URL=http://localhost:3000/auth/callback

# Sui Network
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://fullnode.testnet.sui.io:443
```

### Step 4: Restart Your Development Server

After creating `.env.local`:
```bash
# Stop the dev server (Ctrl+C)
npm run dev
```

Environment variables are loaded at server startup.

## Verification

Once `.env.local` is created, verify it works:

1. Check that the server starts without errors
2. You should see no warnings about missing environment variables
3. Look for "Ready" message in the terminal

## Next Steps

- Task 1.3: Create database schema
- Task 1.4: Implement Supabase client utilities

## Security Notes

- `.env.local` is automatically ignored by git
- Never commit `.env.local` to version control
- Use different Supabase projects for development, staging, and production
- Rotate keys if they're ever exposed
