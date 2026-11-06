import { createFileRoute, redirect } from '@tanstack/react-router'

// A short address for the admin page. It still only opens for emails in ADMIN_EMAILS.
export const Route = createFileRoute('/admin')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/admin' })
  },
})
