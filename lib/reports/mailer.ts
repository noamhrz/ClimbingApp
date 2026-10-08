// Sends report emails through Google Workspace SMTP (app password).
// Env: SMTP_USER (e.g. noam@noam-herz-climbing.com), SMTP_PASS (Google app password),
//      REPORT_TO (optional, defaults to SMTP_USER).

import nodemailer from 'nodemailer'

export function mailerConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS)
}

export async function sendReportEmail(subject: string, html: string, text: string) {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) throw new Error('SMTP_USER / SMTP_PASS are not set')

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass: pass.replace(/\s+/g, '') },
  })

  return transporter.sendMail({
    from: { name: 'MY WAY', address: user },
    to: process.env.REPORT_TO || user,
    subject,
    html,
    text,
  })
}
