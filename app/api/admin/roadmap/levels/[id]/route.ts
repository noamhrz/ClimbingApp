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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyAdminOrCoach(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { Name, Description, Prerequisites, LevelNumber } = body

    const supabaseAdmin = getAdminClient()
    const { data, error } = await supabaseAdmin
      .from('RoadmapLevels')
      .update({ Name, Description, Prerequisites, LevelNumber })
      .eq('LevelID', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyAdminOrCoach(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabaseAdmin = getAdminClient()

    const { error } = await supabaseAdmin
      .from('RoadmapLevels')
      .delete()
      .eq('LevelID', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
