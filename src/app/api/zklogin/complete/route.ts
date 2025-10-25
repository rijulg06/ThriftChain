import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { message: 'zkLogin complete not implemented. Configure provider and ZK proof service.' },
    { status: 501 }
  )
}
