// lib/monthly-sessions-api.ts
// Monthly coaching sessions CRUD

import { supabase } from '@/lib/supabaseClient'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface MonthlySession {
  SessionID: number
  Email: string
  CoachEmail: string
  Year: number
  Month: number
  Notes: string | null
  CreatedAt: string
  UpdatedAt: string
}

export interface CoachTodo {
  TodoID: number
  SessionID: number
  Task: string
  Completed: boolean
  CompletedAt: string | null
  CreatedAt: string
}

export interface AthleteTodo {
  TodoID: number
  SessionID: number
  Task: string
  Completed: boolean
  CompletedAt: string | null
  CreatedAt: string
}

export interface AthleteHighlight {
  HighlightID: number
  SessionID: number
  Content: string
  CreatedAt: string
}

export interface MonthlyAchievement {
  AchievementID: number
  SessionID: number
  Content: string
  CreatedAt: string
}

// ═══════════════════════════════════════════════════════════════
// Session
// ═══════════════════════════════════════════════════════════════

export async function getSession(email: string, year: number, month: number) {
  const { data, error } = await supabase
    .from('MonthlySessions')
    .select('*')
    .eq('Email', email)
    .eq('Year', year)
    .eq('Month', month)
    .maybeSingle()

  if (error) {
    console.error('Error fetching session:', error)
    return null
  }
  return data as MonthlySession | null
}

export async function createSession(email: string, coachEmail: string, year: number, month: number) {
  const { data, error } = await supabase
    .from('MonthlySessions')
    .insert({ Email: email, CoachEmail: coachEmail, Year: year, Month: month })
    .select()
    .single()

  if (error) {
    console.error('Error creating session:', error)
    return null
  }
  return data as MonthlySession
}

export async function updateSessionNotes(sessionId: number, notes: string) {
  const { error } = await supabase
    .from('MonthlySessions')
    .update({ Notes: notes, UpdatedAt: new Date().toISOString() })
    .eq('SessionID', sessionId)

  if (error) {
    console.error('Error updating notes:', error)
    return false
  }
  return true
}

// ═══════════════════════════════════════════════════════════════
// Coach Todos
// ═══════════════════════════════════════════════════════════════

export async function getCoachTodos(sessionId: number) {
  const { data, error } = await supabase
    .from('CoachTodos')
    .select('*')
    .eq('SessionID', sessionId)
    .order('CreatedAt')

  if (error) {
    console.error('Error fetching coach todos:', error)
    return []
  }
  return data as CoachTodo[]
}

export async function addCoachTodo(sessionId: number, task: string) {
  const { data, error } = await supabase
    .from('CoachTodos')
    .insert({ SessionID: sessionId, Task: task, Completed: false })
    .select()
    .single()

  if (error) {
    console.error('Error adding coach todo:', error)
    return null
  }
  return data as CoachTodo
}

export async function updateCoachTodo(todoId: number, task: string) {
  const { error } = await supabase
    .from('CoachTodos')
    .update({ Task: task })
    .eq('TodoID', todoId)

  if (error) {
    console.error('Error updating coach todo:', error)
    return false
  }
  return true
}

export async function toggleCoachTodo(todoId: number, completed: boolean) {
  const { error } = await supabase
    .from('CoachTodos')
    .update({ Completed: completed, CompletedAt: completed ? new Date().toISOString() : null })
    .eq('TodoID', todoId)

  if (error) {
    console.error('Error toggling coach todo:', error)
    return false
  }
  return true
}

export async function deleteCoachTodo(todoId: number) {
  const { error } = await supabase
    .from('CoachTodos')
    .delete()
    .eq('TodoID', todoId)

  if (error) {
    console.error('Error deleting coach todo:', error)
    return false
  }
  return true
}

// ═══════════════════════════════════════════════════════════════
// Athlete Todos
// ═══════════════════════════════════════════════════════════════

export async function getAthleteTodos(sessionId: number) {
  const { data, error } = await supabase
    .from('AthleteTodos')
    .select('*')
    .eq('SessionID', sessionId)
    .order('CreatedAt')

  if (error) {
    console.error('Error fetching athlete todos:', error)
    return []
  }
  return data as AthleteTodo[]
}

export async function addAthleteTodo(sessionId: number, task: string) {
  const { data, error } = await supabase
    .from('AthleteTodos')
    .insert({ SessionID: sessionId, Task: task, Completed: false })
    .select()
    .single()

  if (error) {
    console.error('Error adding athlete todo:', error)
    return null
  }
  return data as AthleteTodo
}

export async function updateAthleteTodo(todoId: number, task: string) {
  const { error } = await supabase
    .from('AthleteTodos')
    .update({ Task: task })
    .eq('TodoID', todoId)

  if (error) {
    console.error('Error updating athlete todo:', error)
    return false
  }
  return true
}

export async function toggleAthleteTodo(todoId: number, completed: boolean) {
  const { error } = await supabase
    .from('AthleteTodos')
    .update({ Completed: completed, CompletedAt: completed ? new Date().toISOString() : null })
    .eq('TodoID', todoId)

  if (error) {
    console.error('Error toggling athlete todo:', error)
    return false
  }
  return true
}

export async function deleteAthleteTodo(todoId: number) {
  const { error } = await supabase
    .from('AthleteTodos')
    .delete()
    .eq('TodoID', todoId)

  if (error) {
    console.error('Error deleting athlete todo:', error)
    return false
  }
  return true
}

// ═══════════════════════════════════════════════════════════════
// Highlights
// ═══════════════════════════════════════════════════════════════

export async function getHighlights(sessionId: number) {
  const { data, error } = await supabase
    .from('AthleteHighlights')
    .select('*')
    .eq('SessionID', sessionId)
    .order('CreatedAt')

  if (error) {
    console.error('Error fetching highlights:', error)
    return []
  }
  return data as AthleteHighlight[]
}

export async function addHighlight(sessionId: number, content: string) {
  const { data, error } = await supabase
    .from('AthleteHighlights')
    .insert({ SessionID: sessionId, Content: content })
    .select()
    .single()

  if (error) {
    console.error('Error adding highlight:', error)
    return null
  }
  return data as AthleteHighlight
}

export async function updateHighlight(highlightId: number, content: string) {
  const { error } = await supabase
    .from('AthleteHighlights')
    .update({ Content: content })
    .eq('HighlightID', highlightId)

  if (error) {
    console.error('Error updating highlight:', error)
    return false
  }
  return true
}

export async function deleteHighlight(highlightId: number) {
  const { error } = await supabase
    .from('AthleteHighlights')
    .delete()
    .eq('HighlightID', highlightId)

  if (error) {
    console.error('Error deleting highlight:', error)
    return false
  }
  return true
}

// ═══════════════════════════════════════════════════════════════
// Monthly Achievements
// ═══════════════════════════════════════════════════════════════

export async function getAchievements(sessionId: number) {
  const { data, error } = await supabase
    .from('MonthlyAchievements')
    .select('*')
    .eq('SessionID', sessionId)
    .order('CreatedAt')

  if (error) {
    console.error('Error fetching achievements:', error)
    return []
  }
  return data as MonthlyAchievement[]
}

export async function addAchievement(sessionId: number, content: string) {
  const { data, error } = await supabase
    .from('MonthlyAchievements')
    .insert({ SessionID: sessionId, Content: content })
    .select()
    .single()

  if (error) {
    console.error('Error adding achievement:', error)
    return null
  }
  return data as MonthlyAchievement
}

export async function updateAchievement(achievementId: number, content: string) {
  const { error } = await supabase
    .from('MonthlyAchievements')
    .update({ Content: content })
    .eq('AchievementID', achievementId)

  if (error) {
    console.error('Error updating achievement:', error)
    return false
  }
  return true
}

export async function deleteAchievement(achievementId: number) {
  const { error } = await supabase
    .from('MonthlyAchievements')
    .delete()
    .eq('AchievementID', achievementId)

  if (error) {
    console.error('Error deleting achievement:', error)
    return false
  }
  return true
}

// ═══════════════════════════════════════════════════════════════
// Users list (role-aware)
// ═══════════════════════════════════════════════════════════════

export async function getUsersForSessions(currentEmail: string, currentRole: 'admin' | 'coach' | 'user') {
  if (currentRole === 'user') {
    const { data } = await supabase
      .from('Users')
      .select('Email, Name')
      .eq('Email', currentEmail)
      .single()
    return data ? [data] : []
  }

  if (currentRole === 'admin') {
    const { data } = await supabase
      .from('Users')
      .select('Email, Name')
      .order('Name')
    return data || []
  }

  // coach — only their trainees
  const { data: trainees } = await supabase
    .from('CoachTraineesActiveView')
    .select('TraineeEmail, TraineeName')
    .eq('CoachEmail', currentEmail)

  return (trainees || []).map(t => ({ Email: t.TraineeEmail, Name: t.TraineeName }))
}
