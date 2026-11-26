'use client'

// WhatsApp message to all trainees (admin only), through the approved broadcast template.
// Topic (presets or free) + content + an extra line; live preview of the message as it will
// arrive; "send me a test" first; then send to every active trainee with a phone.

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { LuMegaphone, LuSend, LuSmartphone, LuTriangleAlert } from 'react-icons/lu'

const TOPICS = ['עדכוני מערכת', 'קביעת סשן לחודש הקרוב', 'פרסום בלוג חדש']
const DEFAULT_EXTRA = 'נתראה באימון 💪'
const MAX = 900

interface Recipient { email: string; name: string; hasPhone: boolean }
interface Past { BroadcastID: number; CreatedAt: string; Topic: string; Body: string; Recipients: number; Sent: number; Failed: number }
interface Result { sent: number; failed: number; details: { name: string; ok: boolean; error?: string }[]; test: boolean }

const headers = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }
}
/** how WhatsApp will show a template variable: no line breaks */
const oneLine = (s: string) => s.replace(/\s*\n+\s*/g, ' | ').trim()

export default function BroadcastPage() {
  const { currentUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const isAdmin = currentUser?.Role === 'admin'

  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [history, setHistory] = useState<Past[]>([])
  const [templateReady, setTemplateReady] = useState(true)
  const [loading, setLoading] = useState(true)

  const [topicPick, setTopicPick] = useState(TOPICS[0])
  const [customTopic, setCustomTopic] = useState('')
  const [body, setBody] = useState('')
  const [extra, setExtra] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState<false | 'test' | 'all'>(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  const topic = topicPick === 'other' ? customTopic.trim() : topicPick
  const withPhone = recipients.filter(r => r.hasPhone)
  const noPhone = recipients.filter(r => !r.hasPhone)
  const canSend = !!topic && !!body.trim() && body.length <= MAX && templateReady && !sending

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/broadcast', { headers: await headers() })
    const j = await res.json()
    if (!res.ok) { setError(j.error ?? 'שגיאה בטעינה'); setLoading(false); return }
    setRecipients(j.recipients); setHistory(j.history); setTemplateReady(j.templateReady); setLoading(false)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) { router.push('/dashboard'); return }
    void load()
  }, [authLoading, isAdmin, load, router])

  const send = async (test: boolean) => {
    setError(''); setResult(null); setSending(test ? 'test' : 'all')
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST', headers: await headers(),
        body: JSON.stringify({ topic, body, extra, test }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'השליחה נכשלה')
      setResult({ ...j, test })
      if (!test) { setConfirming(false); setBody(''); setExtra(''); void load() }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  if (authLoading || loading) return <div className="p-6 text-muted">טוען…</div>

  const previewName = (withPhone[0]?.name ?? 'דנה').split(' ')[0]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-28 flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><LuMegaphone aria-hidden className="w-6 h-6 text-accent" />הודעה לכל המתאמנים</h1>
        <p className="text-sm text-muted mt-1">נשלחת בוואטסאפ לכל מתאמן פעיל שיש לו מספר טלפון בפרופיל.</p>
      </div>

      {!templateReady && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
          <LuTriangleAlert aria-hidden className="w-5 h-5 shrink-0 mt-0.5" />
          התבנית בטווילו עוד לא מחוברת. אפשר לכתוב ולראות תצוגה מקדימה, והשליחה תיפתח אחרי שהתבנית תאושר ותחובר.
        </div>
      )}

      <div className="flex flex-wrap gap-5">
        {/* form */}
        <div className="flex-[999_1_360px] min-w-0 flex flex-col gap-4 bg-surface border border-line rounded-2xl p-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-bold text-fg-2 mb-2">נושא</legend>
            <div className="flex flex-wrap gap-2">
              {[...TOPICS, 'other'].map(t => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={topicPick === t}
                  onClick={() => setTopicPick(t)}
                  className={`min-h-10 px-3.5 rounded-full border text-sm font-bold ${topicPick === t ? 'bg-accent border-accent text-on-accent' : 'bg-raised border-line-strong text-fg-2'}`}
                >
                  {t === 'other' ? 'אחר…' : t}
                </button>
              ))}
            </div>
            {topicPick === 'other' && (
              <input
                aria-label="נושא אחר"
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                placeholder="למשל: שינוי בלוח הזמנים"
                className="h-11 rounded-xl border border-line-strong bg-raised px-3 text-fg focus:outline-none focus:border-accent"
              />
            )}
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bc-body" className="text-sm font-bold text-fg-2">תוכן</label>
            <textarea
              id="bc-body"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              placeholder="מה רוצים להגיד?"
              className="rounded-xl border border-line-strong bg-raised p-3 text-fg leading-relaxed focus:outline-none focus:border-accent"
            />
            <div className="flex justify-between text-xs text-muted">
              <span>בוואטסאפ התוכן מופיע בפסקה אחת: ירידת שורה הופכת ל-״|״</span>
              <span className={`tabular-nums ${body.length > MAX ? 'text-danger font-bold' : ''}`}>{body.length}/{MAX}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bc-extra" className="text-sm font-bold text-fg-2">שורה נוספת <span className="font-normal text-muted">(לא חובה: קישור, תאריך…)</span></label>
            <input
              id="bc-extra"
              value={extra}
              onChange={e => setExtra(e.target.value)}
              placeholder={DEFAULT_EXTRA}
              className="h-11 rounded-xl border border-line-strong bg-raised px-3 text-fg focus:outline-none focus:border-accent"
            />
          </div>

          {error && <p role="alert" className="text-sm font-bold text-danger">{error}</p>}
          {result && (
            <div role="status" className={`rounded-xl p-3 text-sm font-bold ${result.failed ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
              {result.test ? 'הודעת בדיקה נשלחה אליך.' : `נשלח ל-${result.sent} מתאמנים.`}
              {result.failed > 0 && <> {result.failed} נכשלו: {result.details.filter(d => !d.ok).map(d => d.name).join(', ')}</>}
            </div>
          )}

          {!confirming ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!canSend} onClick={() => send(true)}
                className="flex-1 min-w-[150px] h-12 rounded-xl border border-line-strong bg-raised font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40">
                <LuSmartphone aria-hidden className="w-4 h-4" />{sending === 'test' ? 'שולח…' : 'שלח לי בדיקה'}
              </button>
              <button type="button" disabled={!canSend || !withPhone.length} onClick={() => setConfirming(true)}
                className="flex-1 min-w-[150px] h-12 rounded-xl bg-accent text-on-accent font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-40">
                <LuSend aria-hidden className="w-4 h-4" />שליחה ל-{withPhone.length} מתאמנים
              </button>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-accent p-3 flex flex-col gap-2">
              <p className="font-bold">לשלוח עכשיו ל-{withPhone.length} מתאמנים? אי אפשר לבטל אחרי השליחה.</p>
              <div className="flex gap-2">
                <button type="button" disabled={!!sending} onClick={() => send(false)} className="flex-1 h-11 rounded-xl bg-accent text-on-accent font-extrabold disabled:opacity-50">
                  {sending === 'all' ? 'שולח…' : 'כן, לשלוח'}
                </button>
                <button type="button" disabled={!!sending} onClick={() => setConfirming(false)} className="h-11 px-4 rounded-xl border border-line-strong font-bold">ביטול</button>
              </div>
            </div>
          )}
        </div>

        {/* preview */}
        <div className="flex-[1_1_300px] min-w-0 flex flex-col gap-2">
          <p className="text-sm font-bold text-fg-2">כך זה ייראה בוואטסאפ</p>
          <div className="rounded-2xl bg-[#0B141A] p-4">
            <div className="max-w-[340px] rounded-xl rounded-tr-sm bg-[#202C33] text-[#E9EDEF] p-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {`היי ${previewName} 👋\nהודעה בנושא: ${topic || '…'}\n\n${oneLine(body) || '…'}\n\n📌 ${oneLine(extra) || DEFAULT_EXTRA}\n\nנועם הרץ · MY WAY`}
            </div>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-fg-2 font-bold py-1">מי יקבל ({withPhone.length})</summary>
            <p className="text-muted pt-1">{withPhone.map(r => r.name).join(' · ') || 'אף אחד'}</p>
          </details>
          {noPhone.length > 0 && (
            <p className="text-sm text-warning">בלי מספר טלפון, לא יקבלו ({noPhone.length}): {noPhone.map(r => r.name).join(' · ')}</p>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-extrabold">נשלחו לאחרונה</h2>
          {history.map(h => (
            <div key={h.BroadcastID} className="rounded-xl border border-line bg-surface p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-bold">{h.Topic}</span>
                <span className="text-muted tabular-nums">{new Date(h.CreatedAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })} · {h.Sent}/{h.Recipients}{h.Failed ? ` · ${h.Failed} נכשלו` : ''}</span>
              </div>
              <p className="text-fg-2 mt-1 line-clamp-2">{h.Body}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
