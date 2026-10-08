// Renders the monthly trainee card (email-safe HTML). The same card is shown
// in the app's monthly report page and in the monthly coach email.

import { C, APP_URL, esc, layout } from './email-kit'
import type { ClimbType, CountBucket, ExerciseSeries, GoalRow, MonthlyReport, VolumeBucket } from './monthly-data'
import { shortDate } from './dates'

const TYPE_COLOR: Record<ClimbType, string> = { Boulder: C.accent, Board: C.warning, Lead: C.info }
const TYPE_LABEL: Record<ClimbType, string> = { Boulder: 'בולדר', Board: 'בורד', Lead: 'הובלה' }

const r1 = (n: number) => String(Math.round(n * 10) / 10)

function niceTicks(max: number, steps = 3): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / steps
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? raw
  const top = Math.ceil(max / step) * step
  const out: number[] = []
  for (let v = 0; v <= top + 1e-9; v += step) out.push(Math.round(v * 100) / 100)
  return out
}

function section(title: string, aside: string, body: string): string {
  return `<tr><td style="padding:18px 20px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-size:16px;font-weight:800;color:${C.fg};">${title}</td>
      <td align="left" style="font-size:12px;color:${C.muted};">${aside}</td>
    </tr></table>
    <div style="padding-top:10px;">${body}</div>
  </td></tr>`
}

/** Vertical axis column with tick labels; height in px matches the plot area. */
function axisCell(ticks: number[], height: number, unit = ''): string {
  const max = ticks[ticks.length - 1]
  const step = Math.round(height / (ticks.length - 1))
  const rows = ticks.slice(1).reverse().map(v =>
    `<div style="height:${step}px;font-size:10px;color:${C.faint};line-height:10px;border-top:1px dashed ${C.line};">${r1(v)}</div>`).join('')
  return `<td valign="bottom" style="width:30px;padding-right:6px;">
    ${unit ? `<div style="font-size:9px;color:${C.faint};">${esc(unit)}</div>` : ''}
    ${rows}<div style="font-size:10px;color:${C.faint};line-height:10px;">0</div>
  </td>`.replace('MAXPLACEHOLDER', String(max))
}

function labelsRow(labels: { text: string; current?: boolean }[]): string {
  return `<tr>${labels.map(l => `<td align="center" style="padding-top:4px;font-size:10px;color:${l.current ? C.fg : C.faint};font-weight:${l.current ? 700 : 400};">${esc(l.text)}</td>`).join('')}<td></td></tr>`
}

function countChart(buckets: CountBucket[], height: number): string {
  const max = Math.max(1, ...buckets.map(b => Math.max(b.planned, b.done)))
  const ticks = niceTicks(max, 3)
  const scale = height / ticks[ticks.length - 1]
  const cols = buckets.map(b => {
    const ph = Math.round(b.planned * scale)
    const dh = Math.round(Math.min(b.done, b.planned || b.done) * scale)
    const rate = b.planned ? b.done / b.planned : b.done ? 1 : 0
    const col = rate >= 0.8 ? C.success : rate >= 0.5 ? C.warning : C.danger
    const box = ph
      ? `<div style="height:${ph}px;border:1px solid ${C.lineStrong};border-bottom:0;border-radius:3px 3px 0 0;${b.current ? `outline:2px solid ${C.accent};` : ''}">
           <div style="height:${Math.max(0, ph - dh)}px;line-height:0;font-size:0;">&nbsp;</div>
           <div style="height:${dh}px;line-height:0;font-size:0;background:${col};">&nbsp;</div>
         </div>`
      : `<div style="height:2px;line-height:0;font-size:0;background:${C.line};">&nbsp;</div>`
    return `<td valign="bottom" align="center" style="padding:0 2px;">
      <div style="font-size:11px;font-weight:700;color:${b.current ? C.fg : C.fg2};padding-bottom:2px;">${b.planned ? `${b.done}/${b.planned}` : '–'}</div>${box}</td>`
  }).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid ${C.lineStrong};">
    <tr style="height:${height + 18}px;">${cols}${axisCell(ticks, height)}</tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${labelsRow(buckets.map(b => ({ text: b.label, current: b.current })))}</table>
    <div style="font-size:11px;color:${C.muted};padding-top:6px;">
      <span style="color:${C.success}">■</span> 80%+ &nbsp; <span style="color:${C.warning}">■</span> 50–80% &nbsp; <span style="color:${C.danger}">■</span> מתחת ל-50% &nbsp; ☐ מתוכננים · מעל כל עמודה: בוצעו/מתוכננים
    </div>`
}

function volumeChart(buckets: VolumeBucket[], height: number): string {
  const total = (b: VolumeBucket) => b.Boulder + b.Board + b.Lead
  const ticks = niceTicks(Math.max(1, ...buckets.map(total)), 3)
  const scale = height / ticks[ticks.length - 1]
  const cols = buckets.map(b => {
    const segs = (['Boulder', 'Board', 'Lead'] as ClimbType[])
      .map(t => ({ t, h: Math.round(b[t] * scale) })).filter(s => s.h > 0)
      .map(s => `<div style="height:${s.h}px;line-height:0;font-size:0;background:${TYPE_COLOR[s.t]};">&nbsp;</div>`).join('')
    return `<td valign="bottom" align="center" style="padding:0 6px;">
      <div style="font-size:12px;font-weight:700;color:${b.current ? C.fg : C.fg2};padding-bottom:3px;">${Math.round(total(b))}</div>
      <div style="${b.current ? `outline:2px solid ${C.accent};outline-offset:2px;` : ''}">${segs || `<div style="height:2px;background:${C.line};font-size:0;line-height:0;">&nbsp;</div>`}</div></td>`
  }).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid ${C.lineStrong};">
    <tr style="height:${height + 20}px;">${cols}${axisCell(ticks, height)}</tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${labelsRow(buckets.map(b => ({ text: b.note ? `${b.label} (${b.note})` : b.label, current: b.current })))}</table>`
}

function legend(totals?: Record<ClimbType, number>): string {
  return `<div style="font-size:12px;color:${C.muted};padding-top:8px;">${(['Lead', 'Board', 'Boulder'] as ClimbType[])
    .map(t => `<span style="color:${TYPE_COLOR[t]}">●</span> ${TYPE_LABEL[t]}${totals ? ` ${Math.round(totals[t])}` : ''}`).join(' &nbsp; ')}</div>`
}

function goalBars(type: ClimbType, rows: GoalRow[]): string {
  if (!rows.length) return ''
  return `<div style="color:${TYPE_COLOR[type]};font-weight:700;font-size:13px;padding:8px 0 4px;">${TYPE_LABEL[type]}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.map(g => {
    const pct = Math.min(100, Math.round((g.actual / g.target) * 100))
    const done = g.actual >= g.target
    return `<tr>
      <td style="width:52px;font-size:13px;color:${C.fg2};padding:3px 0;" dir="ltr" align="right">${esc(g.grade)}</td>
      <td style="padding:3px 8px;"><div style="height:10px;background:${C.line};border-radius:999px;overflow:hidden;"><div style="width:${pct}%;height:10px;background:${done ? C.success : TYPE_COLOR[type]};font-size:0;line-height:0;">&nbsp;</div></div></td>
      <td style="width:56px;font-size:13px;color:${done ? C.success : C.fg2};font-weight:${done ? 700 : 400};" align="left">${g.actual}/${g.target}${done ? ' ✓' : ''}</td>
    </tr>`
  }).join('')}</table>`
}

function exerciseCard(e: ExerciseSeries, color: string): string {
  const vals = e.points.map(p => (e.metric === 'weight' ? p.weight : e.metric === 'duration' ? p.duration : p.reps) ?? 0)
  const ticks = niceTicks(Math.max(1, ...vals), 2)
  const h = 60
  const scale = h / ticks[ticks.length - 1]
  const unit = e.metric === 'weight' ? 'ק״ג' : e.metric === 'duration' ? 'שנ׳' : 'חזרות'
  const cols = e.points.map((p, i) => {
    const v = vals[i]
    const bh = Math.max(3, Math.round(v * scale))
    return `<td valign="bottom" align="center" style="padding:0 2px;">
      <div style="font-size:10px;font-weight:700;color:${C.fg};line-height:1.1;">${r1(v)}</div>
      ${e.metric === 'weight' && p.reps != null ? `<div style="font-size:9px;color:${C.muted};line-height:1.1;">×${p.reps}</div>` : ''}
      <div style="height:${bh}px;line-height:0;font-size:0;background:${i < 5 ? C.lineStrong : color};border-radius:2px 2px 0 0;margin-top:2px;">&nbsp;</div>
    </td>`
  }).join('')
  const pct = Math.round(e.change * 100)
  const summary = e.metric === 'weight'
    ? `משקל ${r1(e.prevAvg)} → ${r1(e.lastAvg)} ק״ג${e.prevReps != null && e.lastReps != null ? ` · חזרות ${r1(e.prevReps)} → ${r1(e.lastReps)}` : ''}`
    : `${unit} ${r1(e.prevAvg)} → ${r1(e.lastAvg)}`
  return `<div style="background:${C.raised};border-radius:12px;padding:10px 12px;margin-bottom:8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-size:14px;font-weight:700;color:${C.fg};">${esc(e.name)}</td>
      <td align="left" style="font-size:12px;font-weight:700;color:${color};">${summary} (${pct > 0 ? '▲' : pct < 0 ? '▼' : ''}${Math.abs(pct)}%)</td>
    </tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid ${C.lineStrong};margin-top:8px;">
      <tr style="height:${h + 28}px;">${cols}${axisCell(ticks, h, unit)}</tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${labelsRow(e.points.map(p => ({ text: shortDate(p.date) })))}</table>
    <div style="font-size:11px;color:${C.muted};padding-top:4px;"><span style="color:${C.lineStrong}">■</span> 5 קודמים &nbsp; <span style="color:${color}">■</span> 5 אחרונים</div>
  </div>`
}

export function renderMonthlyCard(r: MonthlyReport): string {
  const rate = r.completion.planned ? Math.round((r.completion.done / r.completion.planned) * 100) : null
  const rateColor = rate == null ? C.muted : rate >= 80 ? C.success : rate >= 50 ? C.warning : C.danger
  const hasGoals = r.goals.Boulder.length + r.goals.Board.length + r.goals.Lead.length > 0
  const ex = r.exercises
  const openCoach = r.todos.coach.filter(t => !t.done), openAth = r.todos.athlete.filter(t => !t.done)
  const todoList = (items: { task: string }[]) => items.length
    ? items.map(t => `<div style="font-size:13px;color:${C.fg2};padding-top:4px;">☐ ${esc(t.task)}</div>`).join('')
    : `<div style="font-size:13px;color:${C.success};padding-top:4px;">הכול בוצע ✓</div>`

  const parts: string[] = []
  parts.push(section('אימונים בשבוע: 12 שבועות', 'בוצעו מתוך מתוכננים', countChart(r.weekly, 80)))
  parts.push(section('אימונים בחודש: 12 חודשים', 'בוצעו מתוך מתוכננים', countChart(r.monthlyCounts, 90)))
  parts.push(section('נפח טיפוס: 6 חודשים', r.volumeChangePct == null ? 'ניקוד נפח' :
    `<b style="color:${r.volumeChangePct >= 0 ? C.success : C.danger}">${r.volumeChangePct >= 0 ? '▲' : '▼'} ${Math.abs(r.volumeChangePct)}% מהחודש הקודם</b>`,
    volumeChart(r.volumeMonths, 110) + legend()))
  parts.push(section(`פיזור הנפח ב${esc(r.monthLabel.split(' ')[0])} לפי שבוע`, 'ניקוד נפח', volumeChart(r.volumeWeeks, 80) + legend(r.volumeTotals)))
  parts.push(section(`יעדי טיפוס: רבעון ${r.quarter}`, 'שליחות מתוך יעד',
    (hasGoals ? goalBars('Boulder', r.goals.Boulder) + goalBars('Board', r.goals.Board) + goalBars('Lead', r.goals.Lead)
      : `<div style="font-size:13px;color:${C.muted};">לא הוגדרו יעדי טיפוס לרבעון</div>`) +
    (r.newGrades.length ? `<div style="margin-top:10px;background:${C.success}1a;border:1px solid ${C.success}59;border-radius:10px;padding:8px 12px;color:${C.success};font-size:14px;font-weight:700;">דירוג חדש החודש: ${r.newGrades.map(g => `${TYPE_LABEL[g.type]} ${esc(g.grade)}`).join(' · ')}</div>` : '')))
  parts.push(section('יעדים איכותניים', `רבעון ${r.quarter}`,
    r.general.overarching || r.general.goals.length
      ? `<div style="background:${C.raised};border-radius:12px;padding:12px 14px;font-size:14px;color:${C.fg2};line-height:1.7;">
          ${r.general.overarching ? `<div><span style="color:${C.muted}">מטרת־על:</span> <b style="color:${C.fg}">${esc(r.general.overarching)}</b></div>` : ''}
          ${r.general.goals.map((g, i) => `<div>${i + 1}. ${esc(g)}</div>`).join('')}</div>`
      : `<div style="font-size:13px;color:${C.muted};">לא הוגדרו יעדים איכותניים לרבעון</div>`))
  parts.push(section('Road map', `${r.roadmap.started}/${r.roadmap.total} קטגוריות התחילו`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${r.roadmap.rows.map(row => {
      const segs = Array.from({ length: Math.max(1, row.max) }, (_, i) =>
        `<td style="padding:0 1px;"><div style="height:10px;border-radius:2px;background:${i < row.level ? C.accent : C.line};font-size:0;line-height:0;">&nbsp;</div></td>`).join('')
      return `<tr><td style="width:120px;font-size:13px;color:${row.level ? C.fg2 : C.faint};padding:3px 0;">${esc(row.name)}</td>
        <td style="padding:3px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${segs}</tr></table></td>
        <td style="width:40px;font-size:13px;color:${C.fg2};" align="left">${row.level}/${row.max}</td></tr>`
    }).join('')}</table>`))
  if (ex.good.length) parts.push(section(`<span style="color:${C.success}">התקדמות יפה</span>`, 'שיפור של 10%+ · 5 אחרונים מול 5 קודמים', ex.good.map(e => exerciseCard(e, C.success)).join('')))
  if (ex.moderate.length) parts.push(section('התקדמות מתונה', 'שיפור של עד 10%', ex.moderate.map(e =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.raised};border-radius:10px;margin-bottom:6px;"><tr>
      <td style="padding:8px 12px;font-size:14px;color:${C.fg};">${esc(e.name)}</td>
      <td align="left" style="padding:8px 12px;font-size:13px;color:${C.fg2};">${r1(e.prevAvg)} → ${r1(e.lastAvg)} ${e.metric === 'weight' ? 'ק״ג' : e.metric === 'duration' ? 'שנ׳' : 'חזרות'} · ▲${Math.round(e.change * 100)}%</td></tr></table>`).join('')))
  if (ex.stuck.length) parts.push(section(`<span style="color:${C.warning}">בלי התקדמות</span>`, '10+ ביצועים', ex.stuck.map(e => exerciseCard(e, C.warning)).join('')))
  if (!ex.good.length && !ex.moderate.length && !ex.stuck.length) parts.push(section('תרגילים', '', `<div style="font-size:13px;color:${C.muted};">אין תרגילים עם 10 ביצועים ומעלה שבוצעו החודש</div>`))
  parts.push(section('משימות מהפגישה החודשית', '',
    r.todos.coach.length + r.todos.athlete.length
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="top" width="50%" style="padding-left:6px;"><div style="background:${C.raised};border-radius:12px;padding:10px 12px;"><div style="font-size:12px;color:${C.muted};font-weight:700;">משימות מאמן (${openCoach.length}/${r.todos.coach.length} פתוחות)</div>${todoList(openCoach)}</div></td>
          <td valign="top" width="50%" style="padding-right:6px;"><div style="background:${C.raised};border-radius:12px;padding:10px 12px;"><div style="font-size:12px;color:${C.muted};font-weight:700;">משימות מתאמן (${openAth.length}/${r.todos.athlete.length} פתוחות)</div>${todoList(openAth)}</div></td>
        </tr></table>`
      : `<div style="font-size:13px;color:${C.muted};">אין פגישה חודשית או משימות לחודש הזה</div>`))
  const w = r.wellness
  const wCell = (label: string, value: string) => `<td width="25%" style="padding:0 3px;"><div style="background:${C.raised};border-radius:10px;padding:8px 10px;"><div style="font-size:12px;color:${C.muted};">${label}</div><div style="font-size:18px;font-weight:800;color:${C.fg};">${value}</div></div></td>`
  parts.push(section('Wellness החודש', w.prevReports ? `החודש הקודם: ${w.prevReports} דיווחים` : '',
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      ${wCell('דיווחים', String(w.reports))}${wCell('שינה', w.sleep == null ? '–' : `${w.sleep} ש׳`)}${wCell('כאב (0–3)', w.pain == null ? '–' : String(w.pain))}${wCell('חיוניות (0–3)', w.vitality == null ? '–' : String(w.vitality))}
    </tr></table>`))

  return `<tr><td style="padding:10px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.surface};border:1px solid ${C.line};border-radius:16px;">
    <tr><td style="background:${C.raised};padding:16px 20px;border-bottom:1px solid ${C.line};border-radius:16px 16px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td><div style="font-size:24px;font-weight:800;color:${C.fg};">${esc(r.name)}</div><div style="font-size:13px;color:${C.muted};">${esc(r.monthLabel)}</div></td>
        <td align="left"><div style="font-size:34px;font-weight:800;color:${rateColor};line-height:1;">${rate == null ? '–' : rate + '%'}</div><div style="font-size:12px;color:${C.muted};">${r.completion.done}/${r.completion.planned} אימונים</div></td>
      </tr></table>
    </td></tr>
    ${parts.join('')}
    <tr><td style="padding:16px 20px 18px;"><a href="${APP_URL}/monthly-sessions?email=${encodeURIComponent(r.email)}&month=${r.month}&year=${r.year}" style="color:${C.accent};font-weight:700;font-size:14px;text-decoration:none;">לפגישה החודשית ←</a></td></tr>
  </table>
</td></tr>`
}

export function renderMonthlyEmail(reports: MonthlyReport[], monthLabel: string) {
  const subject = `MY WAY · סקירה חודשית · ${monthLabel}`
  const jump = reports.length > 1
    ? `<tr><td style="padding:14px 4px 0;font-size:13px;color:${C.muted};">כרטיס לכל מתאמן: ${reports.map(r => esc(r.name)).join(' · ')}</td></tr>`
    : ''
  const html = layout({
    title: subject, kicker: 'סקירה חודשית', dateLine: monthLabel,
    body: jump + reports.map(renderMonthlyCard).join(''),
    footerLink: { href: `${APP_URL}/reports/monthly`, label: 'הדו״ח החודשי באפליקציה' },
  })
  const text = reports.map(r => `${r.name}: ${r.completion.done}/${r.completion.planned} אימונים`).join('\n')
  return { subject, html, text }
}

/** One trainee's card as a standalone page, shown inside the app (iframe on /reports/monthly). */
export function renderMonthlyPage(r: MonthlyReport): string {
  return `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base target="_top">
<style>
  @page { size: A4; margin: 10mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print { html, body { background: #0F0E0C !important; } tr, table { page-break-inside: avoid; break-inside: avoid; } }
</style>
<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&display=swap" rel="stylesheet">
<title>${esc(r.name)} · ${esc(r.monthLabel)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="max-width:640px;margin:0 auto;font-family:Assistant,'Segoe UI',Arial,sans-serif;color:${C.fg};text-align:right;">
${renderMonthlyCard(r)}
</table></body></html>`
}
