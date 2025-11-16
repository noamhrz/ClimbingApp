// app/api/admin/update-user/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    // 1. Get the authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 })
    }

    // 2. Create a regular Supabase client to verify the admin
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Set the auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    // 3. Check if user is admin
    const { data: userData } = await supabase
      .from('Users')
      .select('Role')
      .eq('Email', user.email)
      .single()

    if (userData?.Role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    // 4. Get request data
    const { email, name, role } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // 5. Create admin client with Service Role Key
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

    // 6. Update Users table
    const { error: updateError } = await supabaseAdmin
      .from('Users')
      .update({
        Name: name,
        Role: role,
        UpdatedAt: new Date().toISOString()
      })
      .eq('Email', email.toLowerCase())

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    // 7. Update auth metadata if name changed
    if (name) {
      // Get user ID from auth.users
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
      const targetUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

      if (targetUser) {
        await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
          user_metadata: { name }
        })
      }
    }

    console.log('✅ User updated successfully:', { email, name, role })

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    })

  } catch (error: any) {
    console.error('Error in update-user:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}