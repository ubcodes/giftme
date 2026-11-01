import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import appCss from '../styles.css?url'
import { themeInitScript } from '@/components/theme'
import { AuthProvider } from '@/components/auth'
import { getViewerFn } from '@/server/fns/account'

export const Route = createRootRoute({
  beforeLoad: async () => ({ viewer: await getViewerFn() }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'GiftMe · wishlists your friends can actually give to' },
      {
        name: 'description',
        content: 'Make a wishlist for any occasion, share one link, and let friends chip in or reserve a gift. Paid in naira with Paystack.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Bilbo&family=Belleza&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
})

function RootComponent() {
  const { viewer } = Route.useRouteContext()
  return (
    <AuthProvider mode={viewer?.mode ?? 'off'} publishableKey={viewer?.publishableKey ?? null}>
      <Outlet />
    </AuthProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body className="font-body bg-neutral-50 text-neutral-900 dark:bg-[#0a0a0a] dark:text-neutral-100">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
