// app/api/profile/update/route.ts
// All profile writes (own profile, or a coach/admin editing a trainee) go through here with the
// service role, so RLS can't silently drop them. Updates the row, or creates it when missing.
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/phone'

export async function POST(request: Request) {
  try {
    // 1. Verify the caller's JWT
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    // 3. Parse body
    const { email, phone, whatsAppActive, bodyWeight } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    // 2. Caller edits their own profile, or is a coach/admin
    const isSelf = String(user.email ?? '').toLowerCase() === String(email).toLowerCase()
    if (!isSelf) {
      const { data: callerData } = await supabaseUser
        .from('Users')
        .select('Role')
        .eq('Email', user.email)
        .single()
      if (!callerData || !['coach', 'admin'].includes(callerData.Role)) {
        return NextResponse.json({ error: 'אין הרשאה לעדכן פרופיל זה' }, { status: 403 })
      }
    }

    // 4. Build update payload — only include fields that were provided
    const updatePayload: Record<string, unknown> = {
      UpdatedAt: new Date().toISOString()
    }
    if (phone !== undefined) {
      const clean = normalizePhone(phone)
      if (clean === undefined) {
        return NextResponse.json({ error: 'מספר הטלפון לא תקין. למשל 050-1234567' }, { status: 400 })
      }
      updatePayload.Phone = clean
    }
    if (whatsAppActive !== undefined) {
      updatePayload.WhatsAppActive = !!whatsAppActive
    }
    if (bodyWeight !== undefined) {
      const w = Number(bodyWeight)
      if (!Number.isFinite(w) || w < 30 || w > 200) {
        return NextResponse.json({ error: 'משקל גוף חייב להיות בין 30 ל-200 ק"ג' }, { status: 400 })
      }
      updatePayload.BodyWeightKG = w
    }

    // 5. Update via service role (bypasses RLS); create the row when the trainee has none yet
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let { data, error } = await supabaseAdmin
      .from('Profiles')
      .update(updatePayload)
      .eq('Email', email)
      .select()

    if (!error && (!data || data.length === 0)) {
      const insertPayload: Record<string, unknown> = { Email: email, BodyWeightKG: 70, ...updatePayload }
      delete insertPayload.UpdatedAt
      ;({ data, error } = await supabaseAdmin.from('Profiles').insert(insertPayload).select())
    }

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('✅ Profile updated via admin route:', { email, ...updatePayload, rows: data?.length })

    return NextResponse.json({ success: true, data })

  } catch (error: any) {
    console.error('Error in profile/update:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
