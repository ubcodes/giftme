import { createFileRoute } from '@tanstack/react-router'
import { settleContribution } from '@/server/gifts'
import { isValidWebhookSignature, type PaystackStatus } from '@/server/paystack'

type PaystackEvent = {
  event: string
  data: { reference: string; status: PaystackStatus; amount: number }
}

export const Route = createFileRoute('/api/paystack/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text()
        if (!isValidWebhookSignature(raw, request.headers.get('x-paystack-signature'))) {
          return new Response('invalid signature', { status: 401 })
        }

        const event = JSON.parse(raw) as PaystackEvent
        if ((event.event === 'charge.success' || event.event === 'charge.failed') && event.data.reference?.startsWith('gm_')) {
          try {
            await settleContribution(event.data.reference, event.data.status, event.data.amount)
          } catch (err) {
            // A non-200 makes Paystack retry later.
            console.error('[webhook] settle failed', err)
            return new Response('retry', { status: 500 })
          }
        }
        return new Response('ok')
      },
    },
  },
})
