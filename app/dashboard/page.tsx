import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { DashboardClient } from './_components/dashboard-client'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  const userId = (session.user as any)?.id

  const books = await prisma.book.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      chapters: {
        orderBy: { number: 'asc' },
      },
    },
  })

  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      planType: true,
      credits: true
    }
  })

  return <DashboardClient books={books} user={fullUser || session.user} />
}
