import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { GeneratorClient } from './_components/generator-client'

export const dynamic = 'force-dynamic'

export default async function GeneratorPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  return <GeneratorClient user={session.user} />
}
