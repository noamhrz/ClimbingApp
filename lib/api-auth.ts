// lib/api-auth.ts
// Shared auth helpers for API route handlers

import { createClient } from '@supabase/supabase-js'

export interface ApiUser {
  email: string
  role: 'admin' | 'coach' | 'user'
}

/**
 * Validates the JWT from the Authorization header or ?token= query param.
 * Returns the authenticated user's email + role, or null if invalid.
 */
export async function getRequestUser(request: Request): Promise<ApiUser | null> {
  const url = new URL(request.url)

  // Support both Authorization header (standard) and ?token= query param (for <video src>)
  const authHeader = request.headers.get('authorization')
  const token =
    authHeader?.replace('Bearer ', '').trim() ||
    url.searchParams.get('token') ||
    null

  if (!token) {
    console.error('[api-auth] no token found in request')
    return null
  }

  // Validate the JWT via Supabase Auth
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: { user }, error } = await anonClient.auth.getUser(token)
  if (error || !user) {
    console.error('[api-auth] getUser failed:', error?.message)
    return null
  }

  // Look up role using service role client (bypasses RLS — safe for server-side)
  const svc = serviceSupabase()
  const { data: userData, error: userErr } = await svc
    .from('Users')
    .select('Email, Role')
    .eq('Email', user.email)
    .single()

  if (!userData) {
    console.error('[api-auth] Users lookup failed for', user.email, userErr?.message)
    return null
  }

  return { email: userData.Email, role: userData.Role as ApiUser['role'] }
}

/**
 * Checks whether `currentUser` may read/write files belonging to `targetEmail`.
 */
export async function canAccessUserFiles(
  currentEmail: string,
  currentRole: ApiUser['role'],
  targetEmail: string
): Promise<boolean> {
  if (currentRole === 'admin') return true
  if (currentEmail === targetEmail) return true

  if (currentRole === 'coach') {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await supabase
      .from('CoachTraineesActiveView')
      .select('TraineeEmail')
      .eq('CoachEmail', currentEmail)
      .eq('TraineeEmail', targetEmail)
      .maybeSingle()
    return !!data
  }

  return false
}

/** Convenience: create a service-role Supabase client for server-side DB access */
export function serviceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
