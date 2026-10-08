import { redirect } from 'next/navigation'

// The urgency page was replaced by the monthly report (and the coach emails).
export default function UrgencyRedirect() {
  redirect('/reports/monthly')
}
