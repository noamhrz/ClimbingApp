// WhatsApp message from the coach to all trainees (admin only), through the approved
// "myway_broadcast" template:  היי {{1}} 👋 / הודעה בנושא: {{2}} / {{3}} / 📌 {{4}} / נועם הרץ · MY WAY
//   GET  → recipients (active trainees, who has a phone) + recent broadcasts
//   POST { topic, body, extra, test } → test: only to the sender's own phone; else to every
//        active trainee with a phone. Logged in "Broadcasts" (+ WhatsAppLog per message).
import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import twilio from 'twilio'
import { isActiveUser } from '@/lib/active-users'
import { normalizePhone } from '@/lib/phone'
import { TWILIO_FROM, WA_TEMPLATES, waVar } from '@/lib/whatsapp-templates'

export const maxDuration = 120

const DEFAULT_EXTRA = 'נתראה באימון 💪'
const firstName = (n: string | null | undefined) => String(n ?? '').trim().split(/\s+/)[0] || 'שלום'

async function adminFrom(request: Request): Promise<{ db: SupabaseClient; email: string } | NextResponse> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: me } = await db.from('Users').select('Role').eq('Email', user.email).maybeSingle()
  if (me?.Role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  return { db, email: user.email }
}

async function recipients(db: SupabaseClient) {
  const { data: users } = await db.from('Users').select('Email, Name, Role, Status, IsActive').eq('Role', 'user')
  const active = (users ?? []).filter(isActiveUser)
  const { data: profiles } = await db.from('Profiles').select('Email, Phone').in('Email', active.map(u => u.Email))
  const phoneBy = new Map((profiles ?? []).map(p => [p.Email, normalizePhone(p.Phone)]))
  return active
    .map(u => ({ email: u.Email as string, name: (u.Name as string) || u.Email, phone: phoneBy.get(u.Email) ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, 'he'))
}

export async function GET(request: Request) {
  const auth = await adminFrom(request)
  if (auth instanceof NextResponse) return auth
  const list = await recipients(auth.db)
  const { data: history } = await auth.db.from('Broadcasts')
    .select('BroadcastID, CreatedAt, Topic, Body, Recipients, Sent, Failed')
    .order('CreatedAt', { ascending: false }).limit(10)
  return NextResponse.json({
    templateReady: !!WA_TEMPLATES.broadcast,
    recipients: list.map(r => ({ email: r.email, name: r.name, hasPhone: !!r.phone })),
    history: history ?? [],
  })
}

export async function POST(request: Request) {
  const auth = await adminFrom(request)
  if (auth instanceof NextResponse) return auth
  if (!WA_TEMPLATES.broadcast) return NextResponse.json({ error: 'התבנית בטווילו עוד לא הוגדרה' }, { status: 400 })

  const { topic, body, extra, test } = await request.json() as { topic?: string; body?: string; extra?: string; test?: boolean }
  if (!topic?.trim() || !body?.trim()) return NextResponse.json({ error: 'חסר נושא או תוכן' }, { status: 400 })
  if (body.length > 900) return NextResponse.json({ error: 'התוכן ארוך מדי (עד 900 תווים)' }, { status: 400 })

  let targets: { email: string; name: string; phone: string | null }[]
  if (test) {
    const [{ data: me }, { data: prof }] = await Promise.all([
      auth.db.from('Users').select('Name').eq('Email', auth.email).maybeSingle(),
      auth.db.from('Profiles').select('Phone').eq('Email', auth.email).maybeSingle(),
    ])
    targets = [{ email: auth.email, name: me?.Name ?? '', phone: normalizePhone(prof?.Phone) ?? null }]
    if (!targets[0].phone) return NextResponse.json({ error: 'אין לך מספר טלפון בפרופיל' }, { status: 400 })
  } else {
    targets = (await recipients(auth.db)).filter(r => r.phone)
  }

  const tw = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
  const details: { email: string; name: string; ok: boolean; error?: string }[] = []
  for (const t of targets) {
    try {
      const msg = await tw.messages.create({
        from: TWILIO_FROM,
        to: `whatsapp:${t.phone}`,
        contentSid: WA_TEMPLATES.broadcast,
        contentVariables: JSON.stringify({
          '1': waVar(firstName(t.name)),
          '2': waVar(topic),
          '3': waVar(body),
          '4': waVar(extra, DEFAULT_EXTRA),
        }),
      })
      details.push({ email: t.email, name: t.name, ok: true })
      await auth.db.from('WhatsAppLog').insert({
        Email: t.email, CalendarID: null, MessageSid: msg.sid, TemplateName: test ? 'broadcast_test' : 'broadcast', Status: 'sent', SentAt: new Date().toISOString(),
      })
    } catch (e) {
      details.push({ email: t.email, name: t.name, ok: false, error: e instanceof Error ? e.message : String(e) })
    }
    await new Promise(res => setTimeout(res, 300))
  }
  const sent = details.filter(d => d.ok).length
  if (!test) {
    await auth.db.from('Broadcasts').insert({
      SentBy: auth.email, Topic: topic.trim(), Body: body.trim(), Extra: extra?.trim() || null,
      Recipients: targets.length, Sent: sent, Failed: targets.length - sent, Details: details,
    })
  }
  return NextResponse.json({ sent, failed: targets.length - sent, details })
}
