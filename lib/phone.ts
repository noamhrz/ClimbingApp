// Israeli phone → E.164 (+9725XXXXXXXX), the format Twilio/WhatsApp needs.
// Accepts 050-1234567, 0501234567, +972 50 123 4567, 972501234567, 00972...
// Returns null when empty, undefined when the number is not valid.
export function normalizePhone(input: string | null | undefined): string | null | undefined {
  const raw = (input ?? '').trim()
  if (!raw) return null
  let d = raw.replace(/[^\d]/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = '972' + d.slice(1)
  if (d.startsWith('9720')) d = '972' + d.slice(4)
  // Israeli numbers: 972 + 8–9 digits. Other countries: keep any 10–15 digit international number.
  if (d.startsWith('972') ? !/^972\d{8,9}$/.test(d) : !/^\d{10,15}$/.test(d)) return undefined
  return '+' + d
}

/** Local display: +972501234567 → 050-1234567 (other countries unchanged). */
export function displayPhone(e164: string | null | undefined): string {
  if (!e164) return ''
  const m = /^\+972(\d{2})(\d{7})$/.exec(e164)
  return m ? `0${m[1]}-${m[2]}` : e164
}
