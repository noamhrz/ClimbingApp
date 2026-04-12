import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createClient } from '@supabase/supabase-js'

const TEMPLATES = {
  daily_summary: 'HX3b64f105081994e959eda262b7f9f5c4',
  daily_wokout_reminder: 'HX26867161752fb8bdd95f5c86ce68f72b',
}

const TWILIO_FROM = 'whatsapp:+16187406484'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
}

// Twilio contentVariables must not contain raw newlines — replace with separator
function sanitize(val: string): string {
  return val.replace(/\n/g, ' | ')
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
    || request.nextUrl.searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const twilioClient = getTwilioClient()

  // Today's date in Israel time
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
  const startOfDay = `${today}T00:00:00`
  const endOfDay = `${today}T23:59:59`

  // Step 1: Get active WhatsApp profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('Profiles')
    .select('Email, Phone')
    .eq('WhatsAppActive', true)
    .not('Phone', 'is', null)

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ message: 'No active WhatsApp users' })
  }

  const activeEmails = profiles.map((p) => p.Email)

  // Step 2: Get names from Users
  const { data: users } = await supabase
    .from('Users')
    .select('Email, Name')
    .in('Email', activeEmails)

  // Step 2: Get today's incomplete calendar entries for these users
  const { data: calendarEntries, error: calendarError } = await supabase
    .from('Calendar')
    .select('CalendarID, Email, WorkoutID, StartTime, CoachNotes')
    .in('Email', activeEmails)
    .eq('Completed', false)
    .gte('StartTime', startOfDay)
    .lte('StartTime', endOfDay)

  if (calendarError) {
    console.error('Error fetching calendar:', calendarError)
    return NextResponse.json({ error: calendarError.message }, { status: 500 })
  }

  if (!calendarEntries || calendarEntries.length === 0) {
    return NextResponse.json({ message: 'No workouts scheduled today' })
  }

  const workoutIds = [...new Set(calendarEntries.map((e) => e.WorkoutID))]
  const emailsWithWorkouts = [...new Set(calendarEntries.map((e) => e.Email))]

  // Step 3: Fetch workout details
  const { data: workouts, error: workoutsError } = await supabase
    .from('Workouts')
    .select('WorkoutID, Name, containClimbing, containExercise')
    .in('WorkoutID', workoutIds)

  if (workoutsError) {
    console.error('Error fetching workouts:', workoutsError)
    return NextResponse.json({ error: workoutsError.message }, { status: 500 })
  }

  // Step 4: Fetch coach notes from WorkoutsForUser
  const { data: workoutsForUser } = await supabase
    .from('WorkoutsForUser')
    .select('Email, WorkoutID, CoachNote')
    .in('Email', emailsWithWorkouts)
    .in('WorkoutID', workoutIds)

  // Step 5: Fetch exercises
  const { data: workoutExercises } = await supabase
    .from('WorkoutsExercises')
    .select('WorkoutID, Sets, Reps, Rest, Order, ExerciseID')
    .in('WorkoutID', workoutIds)
    .order('Order')

  const exerciseIds = [...new Set((workoutExercises || []).map((e) => e.ExerciseID))]

  const { data: exercises } = await supabase
    .from('Exercises')
    .select('ExerciseID, Name')
    .in('ExerciseID', exerciseIds)

  // Build lookup maps
  const profileByEmail = Object.fromEntries(
    profiles.map((p) => {
      const user = users?.find((u) => u.Email === p.Email)
      return [p.Email, { ...p, Name: user?.Name ?? 'מתאמן' }]
    })
  )
  const workoutById = Object.fromEntries((workouts || []).map((w) => [w.WorkoutID, w]))
  const exerciseById = Object.fromEntries((exercises || []).map((e) => [e.ExerciseID, e]))

  // Group calendar entries by email
  const byEmail: Record<string, typeof calendarEntries> = {}
  for (const entry of calendarEntries) {
    if (!byEmail[entry.Email]) byEmail[entry.Email] = []
    byEmail[entry.Email].push(entry)
  }

  const results = { sent: 0, errors: 0 }

  for (const [email, userWorkouts] of Object.entries(byEmail)) {
    const profile = profileByEmail[email]
    if (!profile) continue

    const { Name: name, Phone: phone } = profile as { Name: string; Phone: string; Email: string }

    // Send daily_summary if 2+ workouts
    if (userWorkouts.length >= 2) {
      const workoutList = userWorkouts
        .map((w, i) => `${i + 1}. ${workoutById[w.WorkoutID]?.Name ?? 'אימון'}`)
        .join('\n')

      try {
        const msg = await twilioClient.messages.create({
          from: TWILIO_FROM,
          to: `whatsapp:${phone}`,
          contentSid: TEMPLATES.daily_summary,
          contentVariables: JSON.stringify({
            '1': sanitize(name),
            '2': String(userWorkouts.length),
            '3': sanitize(workoutList),
          }),
        })

        await supabase.from('WhatsAppLog').insert({
          Email: email,
          CalendarID: null,
          MessageSid: msg.sid,
          TemplateName: 'daily_summary',
          Status: 'sent',
          SentAt: new Date().toISOString(),
        })

        results.sent++
      } catch (err) {
        console.error(`Error sending daily_summary to ${email}:`, err)
        results.errors++
      }
    }

    // Send individual workout reminder for each workout
    for (let i = 0; i < userWorkouts.length; i++) {
      const entry = userWorkouts[i]
      const workout = workoutById[entry.WorkoutID]

      const coachNote =
        workoutsForUser?.find((w) => w.Email === email && w.WorkoutID === entry.WorkoutID)
          ?.CoachNote || 'אין הערות מאמן'

      const entryExercises = (workoutExercises || []).filter(
        (e) => e.WorkoutID === entry.WorkoutID
      )

      const exerciseList =
        entryExercises.length > 0
          ? entryExercises
              .map((e) => {
                const ex = exerciseById[e.ExerciseID]
                let line = `${ex?.Name ?? 'תרגיל'} - ${e.Sets} סטים x ${e.Reps} חזרות`
                if (e.Rest) line += `, מנוחה ${e.Rest} שניות`
                return line
              })
              .join('\n')
          : 'ללא תרגילים'

      const workoutLink = `https://app.noam-herz-climbing.com/calendar-edit/${entry.CalendarID}`

      try {
        console.log('Sending workout reminder:', JSON.stringify({
          '1': String(i + 1),
          '2': String(userWorkouts.length),
          '3': workout?.Name,
          '4': exerciseList,
          '5': coachNote,
          '6': workoutLink,
        }))

        const msg = await twilioClient.messages.create({
          from: TWILIO_FROM,
          to: `whatsapp:${phone}`,
          contentSid: TEMPLATES.daily_wokout_reminder,
          contentVariables: JSON.stringify({
            '1': String(i + 1),
            '2': String(userWorkouts.length),
            '3': sanitize(workout?.Name ?? 'אימון'),
            '4': exerciseList,
            '5': sanitize(coachNote),
            '6': workoutLink,
          }),
        })

        await supabase.from('WhatsAppLog').insert({
          Email: email,
          CalendarID: entry.CalendarID,
          MessageSid: msg.sid,
          TemplateName: 'daily_wokout_reminder',
          Status: 'sent',
          SentAt: new Date().toISOString(),
        })

        results.sent++
      } catch (err) {
        console.error(`Error sending workout reminder to ${email} (CalendarID ${entry.CalendarID}):`, err)
        results.errors++
      }
    }
  }

  return NextResponse.json({ success: true, date: today, ...results })
}
