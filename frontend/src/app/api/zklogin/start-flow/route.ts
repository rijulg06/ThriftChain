import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

// Scaffolding-only: generates an ephemeral key & nonce and returns a placeholder OAuth URL
export async function GET() {
  // Placeholder ephemeral key; replace with real Ed25519 public key from a generated keypair
  const publicKeyBase64 = randomBytes(32).toString('base64')
  const nonce = randomBytes(32).toString('base64url')

  // Persist ephemeral pubkey + nonce for short time (10 mins)
  const store = await cookies()
  store.set('zk_ephemeral_pubkey', publicKeyBase64, { httpOnly: true, secure: true, maxAge: 600, sameSite: 'lax', path: '/' })
  store.set('zk_nonce', nonce, { httpOnly: true, secure: true, maxAge: 600, sameSite: 'lax', path: '/' })

  // Build a placeholder OAuth URL; you must replace with your IdP settings
  const redirectUri = process.env.NEXT_PUBLIC_ZKLOGIN_REDIRECT_URL ?? 'http://localhost:3000/auth/callback'
  const clientId = process.env.ZKLOGIN_OAUTH_CLIENT_ID ?? 'YOUR_CLIENT_ID'
  const providerAuthUrl = process.env.ZKLOGIN_OAUTH_URL ?? 'https://accounts.google.com/o/oauth2/v2/auth'

  const loginUrl = new URL(providerAuthUrl)
  loginUrl.searchParams.set('client_id', clientId)
  loginUrl.searchParams.set('redirect_uri', redirectUri)
  loginUrl.searchParams.set('response_type', 'id_token')
  loginUrl.searchParams.set('scope', 'openid email profile')
  loginUrl.searchParams.set('nonce', nonce)
  loginUrl.searchParams.set('state', 'zklogin')

  return NextResponse.json({
    loginUrl: loginUrl.toString(),
    nonce,
    ephemeralPublicKey: publicKeyBase64,
    note: 'Configure env vars to use a real OAuth provider and complete zkLogin.'
  })
}
