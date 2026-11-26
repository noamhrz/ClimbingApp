// Twilio / WhatsApp: the sender number and the approved Content Templates (HX… ids, not secrets).
// A template left empty is skipped (nothing is sent) until its id is filled in.
// myway_task_reminder → Utility, myway_broadcast → submitted 2026-11-26.

export const TWILIO_FROM = 'whatsapp:+16187406484'

export const WA_TEMPLATES = {
  daily_summary: 'HX3b64f105081994e959eda262b7f9f5c4',
  daily_wokout_reminder: 'HX26867161752fb8bdd95f5c86ce68f72b',
  /** "היי {{1}}, תזכורת למשימה מהפגישה החודשית: "{{2}}" מועד: {{3}} …" */
  task_reminder: 'HX501bb3cc96b96844b6eef085cd70620b',
  /** "היי {{1}} 👋 הודעה בנושא: {{2}} … {{3}} … 📌 {{4}} … נועם הרץ · MY WAY" */
  broadcast: 'HX2a4cd994bcca47197859768ba26e37d7',
}

/** WhatsApp template variables can't hold line breaks or be empty */
export const waVar = (val: string | null | undefined, fallback = '-') => {
  const v = String(val ?? '').replace(/\s*\n+\s*/g, ' | ').replace(/\s{4,}/g, '   ').trim()
  return v || fallback
}
