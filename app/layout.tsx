import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Club 19 Invoice Flow',
  description: 'Professional invoice management system for Club 19',
  icons: {
    icon: '/favicon.ico',
  },
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
          colorPrimary: '#4F46E5',
          colorBackground: '#ffffff',
          colorText: '#1F2937',
        },
        elements: {
          formButtonPrimary: 'bg-primary hover:bg-primary-600 text-white',
          card: 'shadow-lg',
        },
      }}
    >
      <html lang="en">
        <body className={inter.className}>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  )
}
