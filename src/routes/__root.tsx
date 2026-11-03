import { HeadContent, Outlet, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import appCss from '../styles.css?url'
import { themeInitScript } from '@/components/theme'
import { AuthProvider } from '@/components/auth'
import { LiquidGlass } from '@/components/liquid'
import { getViewerFn } from '@/server/fns/account'
import { shareMeta } from '@/lib/share'

const SITE_DESCRIPTION = 'Make a wishlist for any occasion, share one link, and let friends chip in or reserve a gift.'

export const Route = createRootRoute({
  beforeLoad: async () => ({ viewer: await getViewerFn() }),
  loader: ({ context }) => ({ siteUrl: context.viewer.siteUrl }),
  head: ({ loaderData }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#a855f7' },
      { title: 'GiftMe · wishlists your friends can actually give to' },
      { name: 'description', content: SITE_DESCRIPTION },
      ...(loaderData ? shareMeta({ siteUrl: loaderData.siteUrl, title: 'GiftMe', description: SITE_DESCRIPTION, path: '/' }) : []),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
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
      <LiquidGlass />
      <LoadingBar />
      <Outlet />
    </AuthProvider>
  )
}

/** A thin gradient line along the top while the next page loads. */
function LoadingBar() {
  const pending = useRouterState({ select: (s) => s.status === 'pending' })
  // The server and the first browser render disagree on router status, so start hidden.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const loading = mounted && pending
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5 overflow-hidden transition-opacity duration-300 ${loading ? 'opacity-100 delay-150' : 'opacity-0'}`}
    >
      <div className="loading-bar h-full w-1/3 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
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
