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

    const supabaseAdmin = getAdminClient()
    const { data, error } = await supabaseAdmin
      .from('RoadmapCategories')
      .select('*')
      .order('Order', { ascending: true })

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
    const { Name, Icon, Color, Order, Group } = body

    if (!Name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const supabaseAdmin = getAdminClient()

    let nextOrder = Order
    if (nextOrder === undefined) {
      const { data: existing } = await supabaseAdmin
        .from('RoadmapCategories')
        .select('Order')
        .order('Order', { ascending: false })
        .limit(1)
      nextOrder = existing?.[0]?.Order != null ? existing[0].Order + 1 : 0
    }

    const { data, error } = await supabaseAdmin
      .from('RoadmapCategories')
      .insert({ Name, Icon, Color, Order: nextOrder, Group: Group ?? 'כללי' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
