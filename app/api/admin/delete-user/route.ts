// app/api/admin/delete-user/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 1. Get the authorization header
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 })
    }

    // 2. Extract token and create a Supabase client with the user's JWT attached
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    // 3. Check if the caller is an admin (using their verified email from the token)
    const { data: callerData } = await supabase
      .from('Users')
      .select('Role')
      .eq('Email', user.email)
      .single()

    if (callerData?.Role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    // 4. Get the target email from the request body
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // 5. Prevent self-deletion
    if (email === user.email) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // 6. Perform deletion using the service role client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { error: deleteError } = await supabaseAdmin
      .from('Users')
      .delete()
      .eq('Email', email)

    if (deleteError) {
      throw deleteError
    }

    // 7. Delete from auth.users
    const { data: userRow } = await supabaseAdmin
      .from('Users')
      .select('id')
      .eq('Email', email)
      .single()

    if (userRow?.id) {
      await supabaseAdmin.auth.admin.deleteUser(userRow.id)
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
