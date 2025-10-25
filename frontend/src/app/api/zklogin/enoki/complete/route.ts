import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const enokiApiKey = process.env.ENOKI_API_KEY
  if (!enokiApiKey) {
    return NextResponse.json({ message: 'Missing ENOKI_API_KEY' }, { status: 500 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const { hash } = body as { hash?: string }
    if (!hash || typeof hash !== 'string') {
      return NextResponse.json({ message: 'Missing hash from OAuth callback' }, { status: 400 })
    }
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
    const maybeIdToken = await flow.handleAuthCallback(hash)
    const session = await flow.getSession()
    return NextResponse.json({ ok: true, idTokenPresent: !!maybeIdToken, session })
  } catch (e: any) {
    console.error('Enoki complete error', e)
    return NextResponse.json({ message: 'Failed to complete zkLogin via Enoki' }, { status: 500 })
  }
}
