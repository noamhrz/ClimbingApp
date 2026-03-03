// app/api/test-whatsapp/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM!
const TEMPLATE_SID = process.env.TWILIO_TEMPLATE_SID!

export async function GET(request: Request) {
  try {
    // --- שלב 1: משתמשים עם WhatsApp פעיל ---
    const { data: activeUsers, error: usersError } = await supabase
      .from('Profiles')
      .select('Email, Phone, WhatsAppActive')
      .eq('WhatsAppActive', true)
      .not('Phone', 'is', null)

    if (usersError) {
      return NextResponse.json({ error: 'Users DB Error', details: usersError }, { status: 500 })
    }

    if (!activeUsers || activeUsers.length === 0) {
      return NextResponse.json({ message: 'אין משתמשים עם WhatsApp פעיל' })
    }

    const phoneMap = new Map(activeUsers.map(u => [u.Email, u.Phone]))
    const activeEmails = activeUsers.map(u => u.Email)

    // --- שלב 2: אימונים של היום ---
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

    const { data: todayWorkouts, error: calError } = await supabase
      .from('Calendar')
      .select('CalendarID, Email, WorkoutID, StartTime, Completed, CoachNotes, Deloading, DeloadingPercentage')
      .gte('StartTime', startOfDay)
      .lt('StartTime', endOfDay)
      .eq('Completed', false)
      .in('Email', activeEmails)

    if (calError) {
      return NextResponse.json({ error: 'Calendar DB Error', details: calError }, { status: 500 })
    }

    if (!todayWorkouts || todayWorkouts.length === 0) {
      return NextResponse.json({
        message: 'אין אימונים היום למשתמשים פעילים',
        activeUsers: activeUsers.map(u => u.Email),
      })
    }

    // --- שלב 3: קבץ לפי מתאמן ---
    const byUser: Record<string, typeof todayWorkouts> = {}
    for (const w of todayWorkouts) {
      if (!byUser[w.Email]) byUser[w.Email] = []
      byUser[w.Email].push(w)
    }

    // --- שלב 4: שמות ---
    const { data: users } = await supabase
      .from('Users')
      .select('Email, Name')
      .in('Email', Object.keys(byUser))

    const nameMap = new Map(users?.map(u => [u.Email, u.Name]) || [])

    // --- שלב 5: שלח הודעה נפרדת לכל אימון ---
    const results = []

    for (const [email, userWorkouts] of Object.entries(byUser)) {
      const phone = phoneMap.get(email)
      const name = nameMap.get(email) || ''
      const totalWorkouts = userWorkouts.length

      if (!phone) continue

      for (let i = 0; i < userWorkouts.length; i++) {
        const cal = userWorkouts[i]

        const { data: workout } = await supabase
          .from('Workouts')
          .select('WorkoutID, Name, Category, VideoURL, WorkoutNotes, containClimbing, containExercise')
          .eq('WorkoutID', cal.WorkoutID)
          .single()

        const { data: exercises } = await supabase
          .from('WorkoutsExercises')
          .select('Block, "Order", Sets, Reps, Duration, Rest, Exercises (Name, Category, VideoURL)')
          .eq('WorkoutID', cal.WorkoutID)
          .order('Block')
          .order('Order')

        // בנה משתנים
        const nameVar = totalWorkouts > 1
          ? `${name} (${i + 1}/${totalWorkouts})`
          : name

        const workoutDetails = buildWorkoutDetails(workout, exercises)
        const coachNotes = cal.CoachNotes || 'ללא'
        const detailsSpecific = buildDetailsSpecific(workout, cal)

        try {
          const sent = await twilioClient.messages.create({
            from: fromWhatsApp,
            to: `whatsapp:${phone}`,
            contentSid: TEMPLATE_SID,
            contentVariables: JSON.stringify({
              name: nameVar,
              workout_details: workoutDetails,
              coach_notes: coachNotes,
              details_specific: detailsSpecific,
            }),
          })

          results.push({
            email, name, phone,
            workoutName: workout?.Name,
            calendarId: cal.CalendarID,
            messageIndex: `${i + 1}/${totalWorkouts}`,
            messageSid: sent.sid,
            status: 'sent',
          })

          if (i < userWorkouts.length - 1) await sleep(1000)
        } catch (sendError: any) {
          results.push({
            email, name,
            workoutName: workout?.Name,
            messageIndex: `${i + 1}/${totalWorkouts}`,
            status: 'failed',
            error: sendError.message,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      todayWorkoutsCount: todayWorkouts.length,
      activeUsersCount: activeUsers.length,
      messagesSent: results.filter(r => r.status === 'sent').length,
      messagesFailed: results.filter(r => r.status === 'failed').length,
      results,
    })

  } catch (error: any) {
    console.error('WhatsApp error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}

// שם אימון + תרגילים לפי בלוקים (-> workout_details)
function buildWorkoutDetails(workout: any, exercises: any[] | null): string {
  let details = `${workout?.Name || 'אימון'}`
  if (workout?.Category) details += ` | ${workout.Category}`

  if (workout?.containClimbing && workout?.containExercise) {
    details += ` | תרגילים + טיפוס`
  } else if (workout?.containClimbing) {
    details += ` | אימון טיפוס`
  } else if (workout?.containExercise) {
    details += ` | אימון תרגילים`
  }

  if (exercises && exercises.length > 0) {
    const blocks: Record<number, any[]> = {}
    for (const ex of exercises) {
      if (!blocks[ex.Block]) blocks[ex.Block] = []
      blocks[ex.Block].push(ex)
    }

    const blockEntries = Object.entries(blocks).sort(([a], [b]) => Number(a) - Number(b))

    for (const [blockNum, blockExercises] of blockEntries) {
      details += ` | בלוק ${blockNum}: `
      const exList = blockExercises.map(ex => {
        const exerciseName = (ex as any).Exercises?.Name || 'תרגיל'
        const parts = []
        if (ex.Sets) parts.push(`${ex.Sets} סטים`)
        if (ex.Reps) parts.push(`${ex.Reps} חזרות`)
        if (ex.Duration) parts.push(`${ex.Duration}s`)
        if (ex.Rest) parts.push(`מנוחה ${ex.Rest}`)
        return exerciseName + (parts.length ? ` (${parts.join(', ')})` : '')
      })
      details += exList.join(', ')
    }
  }

  return details
}

// דגשים: deloading + הערות + וידאו (-> details_specific)
function buildDetailsSpecific(workout: any, calendar: any): string {
  const parts = []

  if (calendar.Deloading) {
    parts.push(`Deloading ${calendar.DeloadingPercentage || 100}%`)
  }

  if (workout?.WorkoutNotes) {
    parts.push(workout.WorkoutNotes)
  }

  if (workout?.VideoURL) {
    parts.push(`וידאו: ${workout.VideoURL}`)
  }

  return parts.length > 0 ? parts.join(' | ') : 'ללא'
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}