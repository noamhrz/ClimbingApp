// app/api/admin/create-confirmed-user/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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
    const { email, password, name, role } = await request.json()

    // Validate input
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, name, role' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
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

    // 6. Create user with email already confirmed
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,  // ← AUTO-CONFIRM EMAIL!
      user_metadata: {
        name: name
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      
      // Handle specific errors
      if (createError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'משתמש עם אימייל זה כבר קיים במערכת' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    // 7. Update the role in Users table (trigger should have created the record)
    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500))

    const { error: updateError } = await supabaseAdmin
      .from('Users')
      .update({ Role: role })
      .eq('Email', email.toLowerCase())

    if (updateError) {
      console.error('Error updating role:', updateError)
      // Don't fail - the user was created, just role might be wrong
    }

    // 8. Verify the user was created properly
    const { data: verifyUser } = await supabaseAdmin
      .from('Users')
      .select('*')
      .eq('Email', email.toLowerCase())
      .single()

    console.log('✅ User created successfully:', {
      email: newUser.user.email,
      id: newUser.user.id,
      confirmed: !!newUser.user.email_confirmed_at,
      inUsersTable: !!verifyUser,
      role: verifyUser?.Role
    })

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        name: name,
        role: verifyUser?.Role || role,
        confirmed: true,
        created_at: newUser.user.created_at
      }
    })

  } catch (error: any) {
    console.error('Error in create-confirmed-user:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}