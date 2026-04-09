import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createClient } from '@supabase/supabase-js'

const TEMPLATES = {
  daily_wokout_reminder: 'HX26867161752fb8bdd95f5c86ce68f72b',
}

const TWILIO_FROM = 'whatsapp:+16187406484'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const { calendarId } = await request.json()

  if (!calendarId) {
    return NextResponse.json({ error: 'calendarId is required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)

  // Fetch calendar entry
  const { data: entry, error: entryError } = await supabase
    .from('Calendar')
    .select('CalendarID, Email, WorkoutID, CoachNotes')
    .eq('CalendarID', calendarId)
    .single()

  if (entryError || !entry) {
    return NextResponse.json({ error: 'Calendar entry not found' }, { status: 404 })
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('Profiles')
    .select('Name, Phone')
    .eq('Email', entry.Email)
    .single()

  if (!profile?.Phone) {
    return NextResponse.json({ error: 'Profile or phone not found' }, { status: 404 })
  }

  // Fetch workout
  const { data: workout } = await supabase
    .from('Workouts')
    .select('Name')
    .eq('WorkoutID', entry.WorkoutID)
    .single()

  // Fetch coach note from WorkoutsForUser
  const { data: wfu } = await supabase
    .from('WorkoutsForUser')
    .select('CoachNote')
    .eq('Email', entry.Email)
    .eq('WorkoutID', entry.WorkoutID)
    .single()

  const coachNote = wfu?.CoachNote || 'אין הערות מאמן'

  // Fetch exercises
  const { data: workoutExercises } = await supabase
    .from('WorkoutsExercises')
    .select('ExerciseID, Sets, Reps, Rest, Order')
    .eq('WorkoutID', entry.WorkoutID)
    .order('Order')

  const exerciseIds = (workoutExercises || []).map((e) => e.ExerciseID)

  const { data: exercises } = await supabase
    .from('Exercises')
    .select('ExerciseID, Name')
    .in('ExerciseID', exerciseIds)

  const exerciseById = Object.fromEntries((exercises || []).map((e) => [e.ExerciseID, e]))

  const exerciseList =
    (workoutExercises || []).length > 0
      ? (workoutExercises || [])
          .map((e) => {
            const ex = exerciseById[e.ExerciseID]
            let line = `${ex?.Name ?? 'תרגיל'} - ${e.Sets} סטים x ${e.Reps} חזרות`
            if (e.Rest) line += `, מנוחה ${e.Rest} שניות`
            return line
          })
          .join('\n')
      : 'ללא תרגילים'

  const workoutLink = `https://app.noam-herz-climbing.com/calendar/${entry.CalendarID}`

  try {
    const msg = await twilioClient.messages.create({
      from: TWILIO_FROM,
      to: `whatsapp:${profile.Phone}`,
      contentSid: TEMPLATES.daily_wokout_reminder,
      contentVariables: JSON.stringify({
        '1': '1',
        '2': '1',
        '3': workout?.Name ?? 'אימון',
        '4': exerciseList,
        '5': coachNote,
        '6': workoutLink,
      }),
    })

    await supabase.from('WhatsAppLog').insert({
      Email: entry.Email,
      CalendarID: entry.CalendarID,
      MessageSid: msg.sid,
      TemplateName: 'daily_wokout_reminder',
      Status: 'sent',
      SentAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, messageSid: msg.sid, to: profile.Phone })
  } catch (err) {
    console.error('Test WhatsApp error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
