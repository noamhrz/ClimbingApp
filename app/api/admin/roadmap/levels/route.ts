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
