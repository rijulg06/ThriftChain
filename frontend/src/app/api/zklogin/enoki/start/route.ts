import { NextResponse } from 'next/server'

export async function GET() {
  const redirectUri = process.env.NEXT_PUBLIC_ZKLOGIN_REDIRECT_URL
  const enokiApiKey = process.env.ENOKI_API_KEY
  const oauthClientId = process.env.ENOKI_OAUTH_CLIENT_ID

  if (!redirectUri) {
    return NextResponse.json({ message: 'Missing NEXT_PUBLIC_ZKLOGIN_REDIRECT_URL in env' }, { status: 500 })
  }

  if (!enokiApiKey || !oauthClientId) {
    return NextResponse.json({
      message: 'Enoki not configured. Provide ENOKI_API_KEY and ENOKI_OAUTH_CLIENT_ID in your env to enable OAuth.',
      debug: { redirectUri }
    }, { status: 200 })
  }

  try {
    const { EnokiFlow } = await import('@mysten/enoki')
    const { cookies } = await import('next/headers')
    const jar = await cookies()
    const cookieStore = {
      get(key: string) {
        return jar.get(key)?.value ?? null
      },
      set(key: string, value: string) {
        jar.set(key, value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 10 * 60,
        })
      },
      delete(key: string) {
        jar.delete(key)
      },
    }
    const flow = new EnokiFlow({ apiKey: enokiApiKey, store: cookieStore })
    const loginUrl = await flow.createAuthorizationURL({
      provider: 'google',
      clientId: oauthClientId,
      redirectUrl: redirectUri,
      network: 'testnet',
    })
    return NextResponse.json({ loginUrl, debug: { redirectUri, clientId: oauthClientId } })
  } catch (error: unknown) {
    console.error('Enoki start error', error)
    return NextResponse.json({ message: 'Failed to create Enoki OAuth URL. Check keys and server logs.' }, { status: 500 })
  }
}
