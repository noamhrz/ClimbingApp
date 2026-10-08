// Email-safe building blocks (tables + inline styles) in the MY WAY palette.
// Gmail/Outlook ignore <style> and flexbox, so everything is inline and table-based.

export const C = {
  bg: '#0F0E0C', surface: '#151310', raised: '#1C1915', line: '#2B2722', lineStrong: '#3A342D',
  fg: '#EDE8E0', fg2: '#D6D0C6', fg3: '#B8B2A8', muted: '#A39E95', faint: '#8A8379',
  accent: '#E0763A', success: '#5FB37A', warning: '#E3B341', danger: '#E06A5F', info: '#7FB0C9',
}

export const APP_URL = 'https://app.noam-herz-climbing.com'

const FONT = "Assistant, 'Segoe UI', Arial, sans-serif"

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!))
}

export function layout(opts: { title: string; kicker: string; dateLine: string; body: string; footerLink: { href: string; label: string } }): string {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>${esc(opts.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background:${C.bg};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="width:600px;max-width:100%;font-family:${FONT};color:${C.fg};text-align:right;">
  <tr><td style="padding:0 4px 14px;border-bottom:1px solid ${C.line};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-family:${FONT};font-size:30px;font-weight:800;color:${C.fg};letter-spacing:1px;" dir="ltr" align="right">MY <span style="color:${C.accent};">WAY</span></td>
      <td align="left" style="font-size:13px;color:${C.muted};line-height:1.4;">${esc(opts.kicker)}<br><b style="color:${C.fg};">${esc(opts.dateLine)}</b></td>
    </tr></table>
  </td></tr>
  ${opts.body}
  <tr><td style="padding:16px 4px 0;border-top:1px solid ${C.line};font-size:12px;color:${C.faint};">
    נשלח אוטומטית מ-MY WAY · <a href="${opts.footerLink.href}" style="color:${C.muted};">${esc(opts.footerLink.label)}</a>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

export function heading(title: string, sub?: string): string {
  return `<tr><td style="padding:20px 4px 6px;">
    <div style="font-size:22px;font-weight:800;color:${C.fg};">${esc(title)}</div>
    ${sub ? `<div style="font-size:14px;color:${C.fg3};padding-top:2px;">${esc(sub)}</div>` : ''}
  </td></tr>`
}

export function card(opts: { stripe: string; name: string; badge: string; badgeColor: string; lines: string[]; extra?: string; link?: { href: string; label: string } }): string {
  return `<tr><td style="padding:8px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.surface};border:1px solid ${C.line};border-radius:14px;">
    <tr><td style="height:4px;line-height:4px;font-size:0;background:${opts.stripe};border-radius:14px 14px 0 0;">&nbsp;</td></tr>
    <tr><td style="padding:14px 18px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-size:18px;font-weight:800;color:${C.fg};">${esc(opts.name)}</td>
        <td align="left"><span style="display:inline-block;background:${opts.badgeColor}26;color:${opts.badgeColor};font-weight:700;font-size:13px;padding:3px 10px;border-radius:999px;">${esc(opts.badge)}</span></td>
      </tr></table>
      ${opts.lines.map(l => `<div style="font-size:15px;color:${C.fg2};padding-top:8px;line-height:1.5;">${l}</div>`).join('')}
      ${opts.extra ? `<div style="padding-top:10px;">${opts.extra}</div>` : ''}
      ${opts.link ? `<div style="padding-top:10px;"><a href="${opts.link.href}" style="color:${C.accent};font-weight:700;font-size:14px;text-decoration:none;">${esc(opts.link.label)} ←</a></div>` : ''}
    </td></tr>
  </table>
</td></tr>`
}

/** Small bar chart: one bar per value, value printed on top. */
export function miniBars(values: (number | null)[], opts: { max: number; height?: number; color: (v: number) => string; caption?: string; labels?: string[] }): string {
  const h = opts.height ?? 40
  const cells = values.map((v, i) => {
    const bh = v == null ? 0 : Math.max(3, Math.round((v / opts.max) * h))
    const label = v == null ? '–' : String(Math.round(v * 10) / 10)
    return `<td valign="bottom" align="center" style="padding:0 3px;width:30px;">
      <div style="font-size:11px;color:${C.fg2};font-weight:700;padding-bottom:2px;">${label}</div>
      <div style="height:${bh}px;line-height:${bh}px;font-size:0;background:${v == null ? C.lineStrong : opts.color(v)};border-radius:3px 3px 0 0;">&nbsp;</div>
      ${opts.labels ? `<div style="font-size:10px;color:${C.faint};padding-top:3px;">${esc(opts.labels[i] ?? '')}</div>` : ''}
    </td>`
  }).join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}
    ${opts.caption ? `<td valign="bottom" style="padding:0 8px 2px;font-size:12px;color:${C.faint};white-space:nowrap;">${esc(opts.caption)}</td>` : ''}
  </tr></table>`
}

/** 7-day strip of colored squares with weekday labels. */
export function dayStrip(cells: { label: string; color: string }[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells.map(c => `
    <td align="center" style="padding:0 2px;font-size:11px;color:${C.faint};">
      <div style="height:20px;line-height:20px;font-size:0;background:${c.color};border-radius:4px;">&nbsp;</div>${esc(c.label)}
    </td>`).join('')}</tr></table>`
}
