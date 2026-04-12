import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createClient } from '@supabase/supabase-js'
import { copyPreviousWorkout } from '@/utils/copyPreviousWorkout'

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

    const buttonPayload = formData.get('ButtonPayload') as string
    const originalMessageSid = formData.get('OriginalRepliedMessageSid') as string

    // Log all incoming Twilio data for diagnostics
    const allFields: Record<string, string> = {}
    formData.forEach((value, key) => { allFields[key] = value as string })
    console.log('[WhatsApp Webhook] Incoming data:', JSON.stringify(allFields, null, 2))

    if (buttonPayload !== 'completed' && buttonPayload !== 'daily_workout_status') {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const supabase = getSupabaseAdmin()
    const twilioClient = getTwilioClient()

    // Find the original outbound message in WhatsAppLog using the replied-to MessageSid
    const { data: logEntry, error: logError } = await supabase
      .from('WhatsAppLog')
      .select('LogID, Email, CalendarID')
      .eq('MessageSid', originalMessageSid)
      .single()

    if (logError || !logEntry) {
      console.error('WhatsAppLog entry not found for OriginalRepliedMessageSid:', originalMessageSid, logError)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const { Email: email, CalendarID: calendarId } = logEntry

    // Mark as completed and copy previous exercise logs using the shared utility
    const result = await copyPreviousWorkout(calendarId, email)
    console.log('copyPreviousWorkout result:', result.message)

    const exercisesNote = result.success ? 'לפי הסטטיסטיקה של האימון הקודם' : ''

    // Get workout name for the confirmation message
    const { data: calendarEntry } = await supabase
      .from('Calendar')
      .select('WorkoutID')
      .eq('CalendarID', calendarId)
      .single()

    const { data: workout } = await supabase
      .from('Workouts')
      .select('Name')
      .eq('WorkoutID', calendarEntry?.WorkoutID)
      .single()

    // Fetch user name and phone
    const { data: profile } = await supabase
      .from('Profiles')
      .select('Phone')
      .eq('Email', email)
      .single()

    const { data: user } = await supabase
      .from('Users')
      .select('Name')
      .eq('Email', email)
      .single()

    if (!profile?.Phone) {
      console.error('Phone not found for email:', email)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const workoutLink = `https://app.noam-herz-climbing.com/calendar-edit/${calendarId}`

    // Send workout_completed template
    try {
      console.log('Sending workout_completed vars:', JSON.stringify({
        '1': user?.Name,
        '2': (workout?.Name ?? 'אימון').trim(),
        '3': exercisesNote,
        '4': workoutLink,
      }))

      const msg = await twilioClient.messages.create({
        from: TWILIO_FROM,
        to: `whatsapp:${profile.Phone}`,
        contentSid: TEMPLATES.workout_completed,
        contentVariables: JSON.stringify({
          '1': (user?.Name ?? 'מתאמן').trim(),
          '2': (workout?.Name ?? 'האימון').trim(),
          '3': exercisesNote.trim(),
          '4': workoutLink,
        }),
      })

      // Update original log status
      await supabase
        .from('WhatsAppLog')
        .update({ Status: 'completed' })
        .eq('LogID', logEntry.LogID)

      // Log the confirmation message
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
