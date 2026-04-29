import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const getAdminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function verifyAuth(request: Request) {
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
  return user
}

async function verifyAdminOrCoach(request: Request) {
  const user = await verifyAuth(request)
  if (!user) return null

  const token = request.headers.get('authorization')!.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: userData } = await supabase
    .from('Users')
    .select('Role')
    .eq('Email', user.email)
    .single()

  if (!userData || !['admin', 'coach'].includes(userData.Role)) return null
  return user
}

// GET /api/admin/roadmap/progress?email=xxx  — any authenticated user can fetch their own;
// admin/coach can fetch anyone's
export async function GET(request: Request) {
  try {
    const user = await verifyAuth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

    // Non-admin/coach may only fetch their own progress
    if (email !== user.email) {
      const adminUser = await verifyAdminOrCoach(request)
      if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseAdmin = getAdminClient()
    const { data, error } = await supabaseAdmin
      .from('UserRoadmapProgress')
      .select('CategoryID, CurrentLevel')
      .eq('Email', email)

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (error: any) {
    console.error('[roadmap/progress GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyAdminOrCoach(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { email, updates } = body

    if (!email || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'email and updates are required' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    const { error: delError } = await supabaseAdmin
      .from('UserRoadmapProgress')
      .delete()
      .eq('Email', email)

    if (delError) throw delError

    if (updates.length > 0) {
      const rows = updates.map(({ categoryId, level }: { categoryId: number; level: number }) => ({
        Email: email,
        CategoryID: categoryId,
        CurrentLevel: level,
      }))

      const { error: insError } = await supabaseAdmin
        .from('UserRoadmapProgress')
        .insert(rows)

      if (insError) throw insError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[roadmap/progress POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
