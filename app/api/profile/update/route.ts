// app/api/profile/update/route.ts
// Used when a coach/admin impersonates a trainee — bypasses RLS via service role key.
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

    // 2. Verify caller is coach or admin
    const { data: callerData } = await supabaseUser
      .from('Users')
      .select('Role')
      .eq('Email', user.email)
      .single()

    if (!callerData || !['coach', 'admin'].includes(callerData.Role)) {
      return NextResponse.json({ error: 'Forbidden - Coach or Admin only' }, { status: 403 })
    }

    // 3. Parse body
    const { email, phone, whatsAppActive, bodyWeight } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    // 4. Build update payload — only include fields that were provided
    const updatePayload: Record<string, unknown> = {
      UpdatedAt: new Date().toISOString()
    }
    if (phone !== undefined) {
      const cleanPhone = phone ? '+' + phone.replace(/[^\d]/g, '').replace(/^972/, '972') : null
      updatePayload.Phone = cleanPhone
    }
    if (whatsAppActive !== undefined) {
      updatePayload.WhatsAppActive = whatsAppActive
    }
    if (bodyWeight !== undefined) {
      updatePayload.BodyWeightKG = bodyWeight
    }

    // 5. Update via service role (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin
      .from('Profiles')
      .update(updatePayload)
      .eq('Email', email)
      .select()

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
