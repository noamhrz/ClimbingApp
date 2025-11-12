// app/api/admin/delete-user/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: Request) {
  try {
    const { email, adminEmail } = await request.json()

    if (!email || !adminEmail) {
      return NextResponse.json(
        { error: 'Email and adminEmail are required' },
        { status: 400 }
      )
    }

    // Verify that the requester is actually an admin
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('Users')
      .select('Role')
      .eq('Email', adminEmail)
      .single()

    if (adminError || !adminUser || adminUser.Role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Delete from Users table (CASCADE handles related data)
    const { error: deleteError } = await supabaseAdmin
      .from('Users')
      .delete()
      .eq('Email', email)

    if (deleteError) {
      throw deleteError
    }

    // Try to delete from auth.users
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const userToDelete = authUsers?.users?.find(u => u.email === email)

    if (userToDelete) {
      await supabaseAdmin.auth.admin.deleteUser(userToDelete.id)
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