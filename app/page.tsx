import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import InvoiceFlow from '@/components/InvoiceFlow'
import AccessDenied from '@/components/AccessDenied'
import { isAuthorizedUser } from '@/lib/constants'

export default async function Home() {
  const { userId } = await auth()

  // If not authenticated, Clerk middleware will handle it
  if (!userId) {
    return null
  }

  // Get current user details
  const user = await currentUser()

  if (!user) {
    return null
  }

  // Check if user is authorized
  const userEmail = user.emailAddresses[0]?.emailAddress
  const isAuthorized = isAuthorizedUser(userEmail)

  // Show access denied if not authorized
  if (!isAuthorized) {
    return (
      <AccessDenied
        userEmail={userEmail || 'unknown'}
        userName={user.firstName || 'User'}
      />
    )
  }

  // Show invoice flow for authorized users
  return (
    <main className="min-h-screen">
      <InvoiceFlow
        user={{
          email: userEmail || '',
          name: user.firstName || user.username || 'User',
          fullName:
            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            user.username ||
            'User',
          imageUrl: user.imageUrl,
        }}
      />
    </main>
  )
}
