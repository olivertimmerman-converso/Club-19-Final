import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600'],
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Club 19 London | Invoice Management',
  description: 'Luxury invoice management system for Club 19 London',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'Club 19 London',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#000000',
          colorBackground: '#ffffff',
          colorText: '#000000',
        },
        elements: {
          formButtonPrimary: 'bg-club19-black hover:bg-club19-charcoal text-white uppercase tracking-wide',
          card: 'border border-club19-platinum',
        },
      }}
    >
      <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
        <body className={inter.className}>
          <div className="min-h-screen bg-white">
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  )
}
