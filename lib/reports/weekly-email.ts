// Renders the coach's weekly exceptions email.

import { C, APP_URL, card, dayStrip, esc, heading, layout, miniBars } from './email-kit'
import { addDays, heWeekday, longHeDate, shortDate } from './dates'
import type { WeeklyItem, WeeklyTrainee } from './weekly-rules'

const f1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1)
const pct = (n: number) => `${Math.round(n * 100)}%`

const TREND_LABEL = { pain: 'כאב ממוצע', vitality: 'חיוניות ממוצעת', sleep: 'שינה ממוצעת' }
const METRIC_LABEL = { sleep: 'שינה מתחת ל-6 ש׳', pain: 'כאב 2 ומעלה', vitality: 'חיוניות 1 ומטה' }

const ITEM_LABEL: Record<WeeklyItem['kind'], string> = {
  completionDrop: 'ירידה בביצוע', wellnessTrend: 'מגמת Wellness', wellnessOngoing: 'Wellness חריג נמשך',
  missedOngoing: 'פספוסים נמשכים', silenceOngoing: 'שקט', overloadOngoing: 'סימני עומס', neverStarted: 'לא התחיל',
}

function itemLine(it: WeeklyItem): { text: string; extra?: string } {
  switch (it.kind) {
    case 'completionDrop':
      return {
        text: `<b>${ITEM_LABEL[it.kind]}:</b> ${pct(it.lastRate)} השבוע לעומת ${pct(it.priorRate)} ב-3 השבועות הקודמים`,
        extra: miniBars(it.weeks.map(w => (w.planned ? w.done / w.planned : null)).map(v => (v == null ? null : Math.round(v * 100))), {
          max: 100, height: 36,
          color: v => (v >= 80 ? C.success : v >= 50 ? C.warning : C.danger),
          labels: it.weeks.map(w => `${w.done}/${w.planned}`),
          caption: '% ביצוע · 4 שבועות',
        }),
      }
    case 'wellnessTrend':
      return {
        text: `<b>${ITEM_LABEL[it.kind]}:</b> ` + it.changes.map(c =>
          `${TREND_LABEL[c.key]} ${f1(c.from)} ← <b style="color:${C.warning}">${f1(c.to)}</b>`).join(' · ') +
          ` <span style="color:${C.faint}">(שבוע אחרון מול שבועיים לפניו)</span>`,
      }
    case 'wellnessOngoing':
      return { text: `<b>${ITEM_LABEL[it.kind]}:</b> ` + it.metrics.map(m => `${METRIC_LABEL[m.key]} ב-${m.bad} מתוך ${m.of}`).join(' · ') }
    case 'missedOngoing':
      return {
        text: `<b>${ITEM_LABEL[it.kind]}:</b> ${it.missedDays} ימים עם אימון שלא בוצע ב-7 הימים האחרונים`,
        extra: dayStrip(it.strip.map(c => ({
          label: heWeekday(c.date),
          color: c.state === 'done' ? C.success : c.state === 'missed' ? C.danger : c.state === 'partial' ? C.warning : C.line,
        }))),
      }
    case 'silenceOngoing':
      return {
        text: `<b>${ITEM_LABEL[it.kind]}:</b> ` + (it.lastActivity && it.days != null
          ? `${it.days} ימים בלי Wellness ובלי אימון שבוצע (אחרון: ${shortDate(it.lastActivity)})`
          : 'יותר מחודש בלי Wellness ובלי אימון שבוצע'),
      }
    case 'overloadOngoing':
      return { text: `<b>${ITEM_LABEL[it.kind]}:</b> ${[it.painUp && 'כאב ממוצע עולה', it.vitDown && 'חיוניות ממוצעת יורדת'].filter(Boolean).join(' · ')}` }
    case 'neverStarted':
      return { text: `<b>${ITEM_LABEL[it.kind]}:</b> אימונים משובצים מ-${shortDate(it.firstDate)} ועוד לא סומן אף אימון כבוצע` }
  }
}

function concernCard(t: WeeklyTrainee): string {
  const items = t.concerns.map(itemLine)
  const red = t.concerns.some(c => c.kind === 'wellnessOngoing' && c.metrics.some(m => m.key === 'pain'))
  const color = red ? C.danger : C.warning
  return card({
    stripe: color, name: t.name,
    badge: t.concerns.length === 1 ? ITEM_LABEL[t.concerns[0].kind] : `${t.concerns.length} נושאים`, badgeColor: color,
    lines: items.map(i => i.text + (i.extra ? `<div style="padding-top:8px;">${i.extra}</div>` : '')),
    link: { href: `${APP_URL}/athlete-stats/${encodeURIComponent(t.email)}`, label: `פתח את ${t.name}` },
  })
}

function listBox(title: string, color: string, rows: string[], link?: { href: string; label: string }): string {
  return `<tr><td style="padding:8px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.surface};border:1px solid ${C.line};border-radius:14px;">
    <tr><td style="padding:14px 18px 16px;">
      <div style="font-size:16px;font-weight:800;color:${color};">${esc(title)}</div>
      ${rows.map(r => `<div style="font-size:15px;color:${C.fg2};padding-top:7px;">${r}</div>`).join('')}
      ${link ? `<div style="padding-top:10px;"><a href="${link.href}" style="color:${C.accent};font-weight:700;font-size:14px;text-decoration:none;">${esc(link.label)} ←</a></div>` : ''}
    </td></tr>
  </table>
</td></tr>`
}

export function renderWeeklyEmail(today: string, list: WeeklyTrainee[]) {
  const concerns = list.filter(t => t.concerns.length).sort((a, b) => b.concerns.length - a.concerns.length)
  const empty = list.filter(t => t.noWorkoutsNextWeek)
  const positives = list.filter(t => t.positive)
  const weekLine = `${shortDate(addDays(today, -7))}–${shortDate(addDays(today, -1))}`

  const subject = concerns.length
    ? `MY WAY · סקירה שבועית · ${concerns.length === 1 ? 'מתאמן אחד' : `${concerns.length} מתאמנים`} לבדיקה`
    : 'MY WAY · סקירה שבועית · אין חריגים'

  let body = heading(
    concerns.length ? `${concerns.length === 1 ? 'מתאמן אחד' : `${concerns.length} מתאמנים`} לבדיקה` : 'אין חריגים השבוע',
    `שבוע ${weekLine} · רק מה שדורש התייחסות`,
  )
  body += concerns.map(concernCard).join('')

  if (empty.length) {
    body += listBox(`בלי אימונים בשבוע הקרוב (${empty.length})`, C.info,
      empty.map(t => esc(t.name)),
      { href: `${APP_URL}/admin/assign-workouts`, label: 'לשיבוץ אימונים' })
  }
  if (positives.length) {
    body += listBox('חיובי', C.success, positives.map(t =>
      `${esc(t.name)} · ${t.positive!.kind === 'streak'
        ? `<b style="color:${C.success}">${t.positive!.weeks} שבועות ברצף</b> עם כל האימונים`
        : `שבוע מלא, <b style="color:${C.success}">${(t.positive as { done: number }).done}</b> אימונים מתוך ${(t.positive as { done: number }).done}`}`))
  }

  const html = layout({
    title: subject, kicker: 'סקירה שבועית', dateLine: longHeDate(today), body,
    footerLink: { href: `${APP_URL}/reports/monthly`, label: 'הדו״ח החודשי באפליקציה' },
  })

  const text = [
    ...concerns.map(t => `${t.name}: ${t.concerns.map(c => ITEM_LABEL[c.kind]).join(', ')}`),
    empty.length ? `בלי אימונים בשבוע הקרוב: ${empty.map(t => t.name).join(', ')}` : '',
    positives.length ? `חיובי: ${positives.map(t => t.name).join(', ')}` : '',
  ].filter(Boolean).join('\n') || 'אין חריגים השבוע'

  return { subject, html, text, count: concerns.length + empty.length }
}
