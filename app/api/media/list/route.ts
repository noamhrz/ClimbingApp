// GET /api/media/list?email=athlete@example.com

import { NextResponse } from 'next/server'
import { getRequestUser, canAccessUserFiles, serviceSupabase } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

    const canAccess = await canAccessUserFiles(user.email, user.role, email)
    if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = serviceSupabase()
    const { data, error } = await supabase
      .from('MediaFiles')
      .select('*')
      .eq('Email', email)
      .order('CreatedAt', { ascending: false })

    if (error) {
      console.error('List error:', error)
      return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
    }

    return NextResponse.json({ files: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
