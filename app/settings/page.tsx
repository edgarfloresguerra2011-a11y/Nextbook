import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import SettingsClient from './_components/settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  const userId = (session.user as any)?.id
  // Fetch user's provider configs
  const providers = await prisma.providerConfig.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
        accounts: true 
    }
  })

  return <SettingsClient providers={providers} user={user} />
}
