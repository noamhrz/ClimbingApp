// lib/goals-api.ts
// 🎯 Goals System - CRUD Operations

import { isActiveUser } from './active-users'
import { supabase } from '@/lib/supabaseClient'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface GeneralGoalsData {
  OverarchingGoal?: string
  Goal1?: string
  Goal2?: string
  Goal3?: string
  Goal4?: string
  Goal5?: string
}

export interface BoulderGoalsData {
  V0?: number
  V1?: number
  V2?: number
  V3?: number
  V4?: number
  V5?: number
  V6?: number
  V7?: number
  V8?: number
  V9?: number
  V10?: number
  V11?: number
  V12?: number
  V13?: number
  V14?: number
  V15?: number
  V16?: number
  V17?: number
}

export interface BoardGoalsData extends BoulderGoalsData {}

export interface LeadGoalsData {
  '5c'?: number
  '6a'?: number
  '6a+'?: number
  '6b'?: number
  '6b+'?: number
  '6c'?: number
  '6c+'?: number
  '7a'?: number
  '7a+'?: number
  '7b'?: number
  '7b+'?: number
  '7c'?: number
  '7c+'?: number
  '8a'?: number
  '8a+'?: number
  '8b'?: number
  '8b+'?: number
  '8c'?: number
  '8c+'?: number
  '9a'?: number
  '9a+'?: number
  '9b'?: number
  '9b+'?: number
}

// ═══════════════════════════════════════════════════════════════
// READ Operations
// ═══════════════════════════════════════════════════════════════

export async function getGeneralGoals(email: string, year: number, quarter: number) {
  const { data, error } = await supabase
    .from('GeneralGoals')
    .select('*')
    .eq('Email', email)
    .eq('Year', year)
    .eq('Quarter', quarter)
    .maybeSingle()

  if (error) {
    console.error('❌ Error fetching general goals:', error)
    return null
  }

  return data
}

export async function getBoulderGoals(email: string, year: number, quarter: number) {
  const { data, error } = await supabase
    .from('BoulderGoals')
    .select('*')
    .eq('Email', email)
    .eq('Year', year)
    .eq('Quarter', quarter)
    .maybeSingle()

  if (error) {
    console.error('❌ Error fetching boulder goals:', error)
    return null
  }

  return data
}

export async function getBoardGoals(email: string, year: number, quarter: number) {
  const { data, error } = await supabase
    .from('BoardGoals')
    .select('*')
    .eq('Email', email)
    .eq('Year', year)
    .eq('Quarter', quarter)
    .maybeSingle()

  if (error) {
    console.error('❌ Error fetching board goals:', error)
    return null
  }

  return data
}

export async function getLeadGoals(email: string, year: number, quarter: number) {
  const { data, error } = await supabase
    .from('LeadGoals')
    .select('*')
    .eq('Email', email)
    .eq('Year', year)
    .eq('Quarter', quarter)
    .maybeSingle()

  if (error) {
    console.error('❌ Error fetching lead goals:', error)
    return null
  }

  return data
}

// ═══════════════════════════════════════════════════════════════
// UPSERT Operations (Create or Update)
// ═══════════════════════════════════════════════════════════════

export async function saveGeneralGoals(
  email: string,
  year: number,
  quarter: number,
  data: GeneralGoalsData
) {
  const { error } = await supabase
    .from('GeneralGoals')
    .upsert(
      {
        Email: email,
        Year: year,
        Quarter: quarter,
        ...data,
        UpdatedAt: new Date().toISOString(),
      },
      {
        onConflict: 'Email,Year,Quarter',
      }
    )

  if (error) {
    console.error('❌ Error saving general goals:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function saveBoulderGoals(
  email: string,
  year: number,
  quarter: number,
  data: BoulderGoalsData
) {
  const { error } = await supabase
    .from('BoulderGoals')
    .upsert(
      {
        Email: email,
        Year: year,
        Quarter: quarter,
        ...data,
        UpdatedAt: new Date().toISOString(),
      },
      {
        onConflict: 'Email,Year,Quarter',
      }
    )

  if (error) {
    console.error('❌ Error saving boulder goals:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function saveBoardGoals(
  email: string,
  year: number,
  quarter: number,
  data: BoardGoalsData
) {
  const { error } = await supabase
    .from('BoardGoals')
    .upsert(
      {
        Email: email,
        Year: year,
        Quarter: quarter,
        ...data,
        UpdatedAt: new Date().toISOString(),
      },
      {
        onConflict: 'Email,Year,Quarter',
      }
    )

  if (error) {
    console.error('❌ Error saving board goals:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function saveLeadGoals(
  email: string,
  year: number,
  quarter: number,
  data: LeadGoalsData
) {
  const { error } = await supabase
    .from('LeadGoals')
    .upsert(
      {
        Email: email,
        Year: year,
        Quarter: quarter,
        ...data,
        UpdatedAt: new Date().toISOString(),
      },
      {
        onConflict: 'Email,Year,Quarter',
      }
    )

  if (error) {
    console.error('❌ Error saving lead goals:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ═══════════════════════════════════════════════════════════════
// DELETE Operations
// ═══════════════════════════════════════════════════════════════

export async function deleteAllGoals(email: string, year: number, quarter: number) {
  // Delete from all 4 tables
  const promises = [
    supabase.from('GeneralGoals').delete().eq('Email', email).eq('Year', year).eq('Quarter', quarter),
    supabase.from('BoulderGoals').delete().eq('Email', email).eq('Year', year).eq('Quarter', quarter),
    supabase.from('BoardGoals').delete().eq('Email', email).eq('Year', year).eq('Quarter', quarter),
    supabase.from('LeadGoals').delete().eq('Email', email).eq('Year', year).eq('Quarter', quarter),
  ]

  const results = await Promise.all(promises)
  const errors = results.filter(r => r.error).map(r => r.error)

  if (errors.length > 0) {
    console.error('❌ Errors deleting goals:', errors)
    return { success: false, errors }
  }

  return { success: true }
}

// ═══════════════════════════════════════════════════════════════
// Helper: Get users list (for admin/coach)
// ═══════════════════════════════════════════════════════════════

export async function getUsersForGoals(currentEmail: string, currentRole: 'admin' | 'coach' | 'user') {
  if (currentRole === 'user') {
    // Regular user - only themselves
    const { data } = await supabase
      .from('Users')
      .select('Email, Name')
      .eq('Email', currentEmail)
      .single()
    
    return data ? [data] : []
  }

  if (currentRole === 'admin') {
    // Admin - all active users (inactive ones only show in user management)
    const { data } = await supabase
      .from('Users')
      .select('Email, Name, Status, IsActive')
      .order('Name')
    
    return (data || []).filter(u => u.Email === currentEmail || isActiveUser(u)).map(({ Email, Name }) => ({ Email, Name }))
  }

  if (currentRole === 'coach') {
    // Coach - their trainees + themselves
    const { data: trainees } = await supabase
      .from('CoachTraineesActiveView')
      .select('TraineeEmail, TraineeName')
      .eq('CoachEmail', currentEmail)
    
    const { data: self } = await supabase
      .from('Users')
      .select('Email, Name')
      .eq('Email', currentEmail)
      .single()
    
    const emails = (trainees || []).map(t => t.TraineeEmail)
    const { data: statuses } = emails.length
      ? await supabase.from('Users').select('Email, Status, IsActive').in('Email', emails)
      : { data: [] }
    const active = new Set((statuses || []).filter(isActiveUser).map(u => u.Email))

    const traineesList = (trainees || []).filter(t => active.has(t.TraineeEmail)).map(t => ({
      Email: t.TraineeEmail,
      Name: t.TraineeName
    }))
    
    return self ? [self, ...traineesList] : traineesList
  }

  return []
}