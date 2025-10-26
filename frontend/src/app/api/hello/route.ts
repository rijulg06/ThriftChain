import { NextResponse } from 'next/server'

type Data = {
  message: string
  now?: string
  echo?: unknown
}

export async function GET() {
  const data: Data = { message: 'Hello from ThriftChain API!', now: new Date().toISOString() }
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    // ignore JSON parse errors; body will remain null
  }

  const data: Data = {
    message: 'Received POST',
    now: new Date().toISOString(),
    echo: body,
  }
  return NextResponse.json(data)
}
