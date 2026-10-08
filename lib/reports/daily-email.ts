// Renders the coach's daily alert email from evaluated alerts.

import { Alert, Severity, WellnessMetric, worstSeverity } from './daily-rules'
import { C, APP_URL, card, dayStrip, esc, heading, layout, miniBars } from './email-kit'
import { heWeekday, longHeDate, shortDate } from './dates'

export interface TraineeAlerts {
  email: string
  name: string
  alerts: Alert[]
}

const SEV_COLOR: Record<Severity, string> = { red: C.danger, amber: C.warning, blue: C.info }

const METRIC_LABEL: Record<WellnessMetric['key'], string> = {
  sleep: 'שינה מתחת ל-6 ש׳',
  pain: 'כאב 2 ומעלה',
  vitality: 'חיוניות 1 ומטה',
}

function painColor(v: number) { return v >= 3 ? C.danger : v >= 2 ? C.warning : C.lineStrong }

function metricChart(m: WellnessMetric): string {
  if (m.key === 'sleep') {
    return miniBars(m.values, { max: 10, color: v => (v > 0 && v < 6 ? C.warning : C.lineStrong), caption: `שינה (ש׳) · ${m.values.length} דיווחים אחרונים` })
  }
  if (m.key === 'pain') {
    return miniBars(m.values, { max: 3, color: painColor, caption: `כאב 0–3 · ${m.values.length} דיווחים אחרונים` })
  }
  return miniBars(m.values, { max: 3, color: v => (v <= 1 ? C.warning : C.lineStrong), caption: `חיוניות 0–3 · ${m.values.length} דיווחים אחרונים` })
}

function f1(n: number) { return (Math.round(n * 10) / 10).toFixed(1) }

function alertBlock(t: TraineeAlerts, a: Alert): string {
  const profile = `${APP_URL}/athlete-stats/${encodeURIComponent(t.email)}`
  switch (a.kind) {
    case 'pain3':
      return card({
        stripe: C.danger, name: t.name, badge: 'כאב חזק', badgeColor: C.danger,
        lines: [`דיווח כאב <b style="color:${C.danger}">3</b> (חזק) ב-${shortDate(a.date)}${a.painArea ? ` · אזור: ${esc(a.painArea)}` : ''}`],
        extra: miniBars(a.recentPain, { max: 3, color: painColor, caption: 'כאב · דיווחים אחרונים' }),
        link: { href: profile, label: `פתח את ${t.name}` },
      })
    case 'wellness':
      return card({
        stripe: SEV_COLOR[a.severity], name: t.name, badge: 'Wellness חריג', badgeColor: SEV_COLOR[a.severity],
        lines: a.metrics.map(m => `${METRIC_LABEL[m.key]} ב-<b>${m.bad}</b> מתוך ${m.of} הדיווחים האחרונים`),
        extra: a.metrics.map(metricChart).join('<div style="height:10px"></div>'),
        link: { href: profile, label: `פתח את ${t.name}` },
      })
    case 'missed':
      return card({
        stripe: C.warning, name: t.name, badge: `${a.missedDays} ימים בלי ביצוע`, badgeColor: C.warning,
        lines: [`ב-7 הימים האחרונים היו <b>${a.missedDays}</b> ימים עם אימון משובץ שלא בוצע`],
        extra: dayStrip(a.strip.map(c => ({
          label: heWeekday(c.date),
          color: c.state === 'done' ? C.success : c.state === 'missed' ? C.danger : c.state === 'partial' ? C.warning : C.line,
        }))),
        link: { href: profile, label: `פתח את ${t.name}` },
      })
    case 'overload': {
      const parts: string[] = []
      if (a.painUp) parts.push(`כאב ממוצע ${f1(a.painFrom)} ← <b style="color:${C.danger}">${f1(a.painTo)}</b>`)
      if (a.vitDown) parts.push(`חיוניות ממוצעת ${f1(a.vitFrom)} ← <b style="color:${C.warning}">${f1(a.vitTo)}</b>`)
      return card({
        stripe: C.warning, name: t.name, badge: 'סימני עומס', badgeColor: C.warning,
        lines: [...parts, '<span style="color:#A39E95">השבוע האחרון לעומת השבוע שלפניו</span>'],
        link: { href: profile, label: `פתח את ${t.name}` },
      })
    }
    case 'silence':
      return card({
        stripe: C.warning, name: t.name, badge: 'שקט', badgeColor: C.warning,
        lines: [`${a.days} ימים בלי Wellness ובלי אימון שבוצע · פעילות אחרונה: ${shortDate(a.lastActivity)}`],
        link: { href: profile, label: `פתח את ${t.name}` },
      })
    case 'newTrainee':
      return card({
        stripe: C.info, name: t.name, badge: 'מתאמן חדש', badgeColor: C.info,
        lines: [`שבוע מהאימון הראשון שתוכנן (${shortDate(a.firstDate)}) ועוד לא סומן אף אימון כבוצע`],
        link: { href: profile, label: `פתח את ${t.name}` },
      })
    case 'planEnding':
      return card({
        stripe: C.info, name: t.name, badge: 'התכנית נגמרת', badgeColor: C.info,
        lines: [`האימון האחרון המשובץ: יום ${heWeekday(a.lastDate)}, ${shortDate(a.lastDate)}. משבוע הבא אין אימונים בלוח.`],
        link: { href: `${APP_URL}/admin/assign-workouts`, label: `לשבץ אימונים ל${t.name}` },
      })
  }
}

const SEV_ORDER: Record<Severity, number> = { red: 0, amber: 1, blue: 2 }

const KIND_LABEL: Record<Alert['kind'], string> = {
  pain3: 'כאב חזק', wellness: 'Wellness חריג', missed: 'פספוסים', overload: 'סימני עומס',
  silence: 'שקט', newTrainee: 'מתאמן חדש', planEnding: 'התכנית נגמרת',
}

export function renderDailyEmail(today: string, list: TraineeAlerts[]) {
  const withAlerts = list.filter(t => t.alerts.length)
    .sort((a, b) => SEV_ORDER[worstSeverity(a.alerts)] - SEV_ORDER[worstSeverity(b.alerts)])
  const count = withAlerts.length
  const subject = count
    ? `MY WAY · ${count === 1 ? 'מתאמן אחד צריך' : `${count} מתאמנים צריכים`} התייחסות היום`
    : 'MY WAY · אין התראות היום'

  const body = count
    ? heading(count === 1 ? 'מתאמן אחד צריך התייחסות היום' : `${count} מתאמנים צריכים התייחסות היום`,
        'רק מצבים שהתחילו היום. מצבים מתמשכים מופיעים בסקירה השבועית.') +
      withAlerts.map(t => t.alerts.map(a => alertBlock(t, a)).join('')).join('')
    : heading('אין התראות היום', 'אף מתאמן לא עבר סף חדש מאז אתמול.')

  const html = layout({
    title: subject, kicker: 'התראה יומית', dateLine: longHeDate(today), body,
    footerLink: { href: `${APP_URL}/reports/monthly`, label: 'הדו״ח החודשי באפליקציה' },
  })

  const text = count
    ? withAlerts.map(t => `${t.name}: ${t.alerts.map(a => KIND_LABEL[a.kind]).join(', ')}`).join('\n')
    : 'אין התראות היום'

  return { subject, html, text, count }
}
