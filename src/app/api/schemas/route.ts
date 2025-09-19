import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
      return NextResponse.json({
        schemas: [],
        count: 0,
        message: 'Supabase not configured'
      })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    let query = supabase.from('global_schemas').select('*')

    if (type !== 'all') {
      // Add filtering logic based on type
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch schemas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      schemas: data,
      count: data?.length || 0
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('global_schemas')
      .insert(body)
      .select()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create schema' },
        { status: 500 }
      )
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}