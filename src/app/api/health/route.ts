import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'utility-schema-extractor-frontend',
    version: '1.0.0'
  })
}