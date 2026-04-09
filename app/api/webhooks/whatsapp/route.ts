import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createClient } from '@supabase/supabase-js'

const TEMPLATES = {
  workout_completed: 'HX95eef29ebe8b504bc07dacc9b1495e83',
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

export async function POST(request: NextRequest) {
  // Always return 200 to Twilio, even on error
  try {
    const formData = await request.formData()

    const smsSid = formData.get('SmsSid') as string
    const buttonPayload = formData.get('ButtonPayload') as string

    if (buttonPayload !== 'completed') {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const supabase = getSupabaseAdmin()
    const twilioClient = getTwilioClient()

    // Find the original outbound message in WhatsAppLog
    const { data: logEntry, error: logError } = await supabase
      .from('WhatsAppLog')
      .select('LogID, Email, CalendarID')
      .eq('MessageSid', smsSid)
      .single()

    if (logError || !logEntry) {
      console.error('WhatsAppLog entry not found for SmsSid:', smsSid, logError)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const { Email: email, CalendarID: calendarId } = logEntry

    // Mark workout as completed
    const { error: updateError } = await supabase
      .from('Calendar')
      .update({ Completed: true })
      .eq('CalendarID', calendarId)

    if (updateError) {
      console.error('Error updating Calendar:', updateError)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Get workout details
    const { data: calendarEntry } = await supabase
      .from('Calendar')
      .select('WorkoutID')
      .eq('CalendarID', calendarId)
      .single()

    const workoutId = calendarEntry?.WorkoutID

    // Get workout info
    const { data: workout } = await supabase
      .from('Workouts')
      .select('Name, containExercise')
      .eq('WorkoutID', workoutId)
      .single()

    let exercisesNote = ''

    if (workout?.containExercise) {
      // Find the most recent previous completed calendar entry for this workout
      const { data: prevCalendar } = await supabase
        .from('Calendar')
        .select('CalendarID')
        .eq('WorkoutID', workoutId)
        .eq('Email', email)
        .eq('Completed', true)
        .neq('CalendarID', calendarId)
        .order('StartTime', { ascending: false })
        .limit(1)
        .single()

      if (prevCalendar) {
        const prevCalendarId = prevCalendar.CalendarID

        // Copy exercise logs from previous session to current
        const { data: prevLogs } = await supabase
          .from('ExerciseLogs')
          .select(
            'Email, WorkoutID, ExerciseID, SetNumber, RepsPlanned, RepsDone, WeightKG, DurationSec, HandSide'
          )
          .eq('CalendarID', prevCalendarId)

        if (prevLogs && prevLogs.length > 0) {
          const newLogs = prevLogs.map((log) => ({
            ...log,
            CalendarID: calendarId,
          }))

          const { error: insertError } = await supabase.from('ExerciseLogs').insert(newLogs)

          if (insertError) {
            console.error('Error copying exercise logs:', insertError)
          } else {
            exercisesNote = 'לפי הסטטיסטיקה של האימון הקודם'
          }
        }
      }
    }

    // Fetch user profile for name and phone
    const { data: profile } = await supabase
      .from('Profiles')
      .select('Name, Phone')
      .eq('Email', email)
      .single()

    if (!profile) {
      console.error('Profile not found for email:', email)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const workoutLink = `https://app.noam-herz-climbing.com/calendar/${calendarId}`

    // Send workout_completed template
    try {
      const msg = await twilioClient.messages.create({
        from: TWILIO_FROM,
        to: `whatsapp:${profile.Phone}`,
        contentSid: TEMPLATES.workout_completed,
        contentVariables: JSON.stringify({
          '1': profile.Name,
          '2': workout?.Name ?? 'האימון',
          '3': exercisesNote,
          '4': workoutLink,
        }),
      })

      // Update WhatsAppLog status
      await supabase
        .from('WhatsAppLog')
        .update({ Status: 'completed' })
        .eq('LogID', logEntry.LogID)

      // Log the new completed message
      await supabase.from('WhatsAppLog').insert({
        Email: email,
        CalendarID: calendarId,
        MessageSid: msg.sid,
        TemplateName: 'workout_completed',
        Status: 'sent',
        SentAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Error sending workout_completed to', email, ':', err)
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
