// Contact form on noam-herz-climbing.com (the strength & pyramid calculator):
// emails Noam the visitor's details and results. Nothing is stored.
// Abuse guards: allowed origins only, honeypot field, minimum fill time,
// size limits, and a per-IP limit (per server instance).

import { NextRequest, NextResponse } from 'next/server'
import { sendSiteContactEmail } from '@/lib/reports/mailer'

const ALLOWED = [/^https:\/\/(www\.)?noam-herz-climbing\.com$/, /^https:\/\/[a-z0-9-]+\.noam-site-cnx\.pages\.dev$/, /^http:\/\/localhost:\d+$/]
const allowed = (o: string | null) => !!o && ALLOWED.some(r => r.test(o))

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': allowed(origin) ? origin! : 'https://noam-herz-climbing.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

const hits = new Map<string, number[]>()
function limited(ip: string) {
  const now = Date.now(), recent = (hits.get(ip) ?? []).filter(t => now - t < 60 * 60 * 1000)
  recent.push(now); hits.set(ip, recent)
  return recent.length > 5
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n)

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get('origin')) })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin'), headers = cors(origin)
  const no = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status, headers })
  if (!allowed(origin)) return no('origin', 403)

  let d: Record<string, unknown>
  try { d = await req.json() } catch { return no('bad json') }

  // bots: honeypot filled, or sent too fast → pretend success
  if (clip(d.website, 200) || Number(d.elapsed) < 4000) return NextResponse.json({ ok: true }, { headers })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  if (limited(ip)) return no('rate', 429)

  const name = clip(d.name, 80), email = clip(d.email, 120), phone = clip(d.phone, 20)
  const message = clip(d.message, 1500), results = clip(d.results, 2000)
  if (!name) return no('name')
  if (!email && !phone) return no('contact')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return no('email')
  if (phone && !/^[+\d][\d\s-]{6,19}$/.test(phone)) return no('phone')

  const text = [`שם: ${name}`, email && `אימייל: ${email}`, phone && `טלפון: ${phone}`, '', message && `הודעה:\n${message}`, '', 'תוצאות המחשבון:', results]
    .filter(x => x !== '').join('\n')
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">
    <p><b>${esc(name)}</b> שלח/ה פנייה ממחשבון הכוח באתר.</p>
    <p>${email ? `אימייל: <a href="mailto:${esc(email)}">${esc(email)}</a><br>` : ''}${phone ? `טלפון: <a href="tel:${esc(phone)}">${esc(phone)}</a>` : ''}</p>
    ${message ? `<p style="white-space:pre-wrap">${esc(message)}</p>` : ''}
    <h3 style="margin:16px 0 4px">תוצאות המחשבון</h3>
    <pre style="white-space:pre-wrap;font-family:inherit;background:#f4f1ec;padding:12px;border-radius:8px">${esc(results)}</pre>
  </div>`

  try {
    await sendSiteContactEmail(`פנייה מהאתר: ${name}`, html, text, email || undefined)
    return NextResponse.json({ ok: true }, { headers })
  } catch (e) {
    console.error('site-contact', e)
    return no('send', 502)
  }
}
