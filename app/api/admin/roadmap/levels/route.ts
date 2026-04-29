import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const getAdminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function verifyAdminOrCoach(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  const { data: userData } = await supabase
    .from('Users')
    .select('Role')
    .eq('Email', user.email)
    .single()

  if (!userData || !['admin', 'coach'].includes(userData.Role)) return null
  return user
}

export async function GET(request: Request) {
  try {
    const user = await verifyAdminOrCoach(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    const supabaseAdmin = getAdminClient()
    let query = supabaseAdmin
      .from('RoadmapLevels')
      .select('*')
      .order('LevelNumber', { ascending: true })

    if (categoryId) query = query.eq('CategoryID', categoryId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await verifyAdminOrCoach(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { updates } = body

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'updates array required' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    // Pass 1: move to temp numbers (10000+) to avoid unique constraint conflicts
    const pass1 = await Promise.all(
      updates.map(({ id, levelNumber }: { id: number; levelNumber: number }) =>
        supabaseAdmin.from('RoadmapLevels').update({ LevelNumber: 10000 + levelNumber }).eq('LevelID', id)
      )
    )
    const err1 = pass1.find(r => r.error)
    if (err1) {
      console.error('[PATCH levels] pass1 error:', err1.error)
      return NextResponse.json({ error: err1.error?.message }, { status: 500 })
    }

    // Pass 2: set final numbers
    const pass2 = await Promise.all(
      updates.map(({ id, levelNumber }: { id: number; levelNumber: number }) =>
        supabaseAdmin.from('RoadmapLevels').update({ LevelNumber: levelNumber }).eq('LevelID', id)
      )
    )
    const err2 = pass2.find(r => r.error)
    if (err2) {
      console.error('[PATCH levels] pass2 error:', err2.error)
      return NextResponse.json({ error: err2.error?.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[PATCH levels] caught error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyAdminOrCoach(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { CategoryID, LevelNumber, Name, Description, Prerequisites } = body

    if (!CategoryID || !Name) {
      return NextResponse.json({ error: 'CategoryID and Name are required' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()
    const insertPayload: Record<string, unknown> = { CategoryID, LevelNumber, Name, Description }
    if (Prerequisites !== undefined) insertPayload.Prerequisites = Prerequisites

    console.log('[roadmap] levels POST insert payload:', insertPayload)
    const { data, error } = await supabaseAdmin
      .from('RoadmapLevels')
      .insert(insertPayload)
      .select()
      .single()

    if (error) { console.error('[roadmap] levels POST error:', error); throw error }
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
