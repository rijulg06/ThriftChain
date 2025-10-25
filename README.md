This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Wallet & zkLogin Integration

This app includes scaffolding for:

- Wallet connect using Suiet Wallet Kit (Login button in the header opens a modal with wallet list).
- zkLogin flow (Enoki-based) with routes and a callback page:
	- `GET /api/zklogin/enoki/start` builds an Enoki OAuth URL for Google and returns it.
	- `POST /api/zklogin/enoki/complete` finalizes the flow from the callback hash and stores a session (scaffold).
	- `GET /auth/callback` captures the OAuth callback and posts the hash to the Enoki complete route.
	- The older generic routes under `/api/zklogin/*` remain as examples.

Environment variables to configure:

```
# Enoki (managed zkLogin)
ENOKI_API_KEY=your_enoki_api_key   # from Enoki portal
ENOKI_OAUTH_CLIENT_ID=your_google_oauth_client_id   # from Google Cloud console
NEXT_PUBLIC_ZKLOGIN_REDIRECT_URL=http://localhost:3000/auth/callback

# Optional: generic OAuth fallback example
ZKLOGIN_OAUTH_URL=https://accounts.google.com/o/oauth2/v2/auth
ZKLOGIN_OAUTH_CLIENT_ID=your_google_client_id
```

Notes:
- Prefer the Enoki routes for production. The generic fallback shows how a custom OAuth flow might look.
- After completion, you can call EnokiFlow `getProof()` and `getKeypair()` (server-side) to derive the Sui address and sign transactions for zkLogin sessions.
- For actions like List/Buy/Delist, build a PTB on the client and sign with the connected wallet or a zkLogin-derived keypair.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
