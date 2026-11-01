// Outgoing email. Uses Resend when RESEND_API_KEY and EMAIL_FROM are set; otherwise the
// message is printed to the server log so local development needs no email account.

export async function sendEmail(msg: { to: string; subject: string; text: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) {
    console.info(`[email] (not sent: no RESEND_API_KEY) to=${msg.to} subject="${msg.subject}"\n${msg.text}`)
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, reply_to: msg.replyTo }),
    })
    if (!res.ok) console.error('[email] send failed', res.status, await res.text())
    return res.ok
  } catch (err) {
    console.error('[email] send failed', err)
    return false
  }
}
