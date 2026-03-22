// app/api/test-whatsapp/route.ts
// WhatsApp integration disabled - endpoint returns 403 until auth is implemented
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Endpoint disabled' }, { status: 403 })
}
