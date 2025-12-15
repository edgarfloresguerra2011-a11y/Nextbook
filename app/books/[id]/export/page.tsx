import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import ExportClient from './_components/export-client'

export const dynamic = 'force-dynamic'

interface ExportPageProps {
  params: {
    id: string
  }
}

export default async function ExportPage({ params }: ExportPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  const userId = (session.user as any)?.id

  // Use findFirst with userId in WHERE clause to match BookPage logic exactly
  const book = await prisma.book.findFirst({
    where: { 
      id: params.id,
      userId
    },
    include: {
      chapters: {
        orderBy: { chapterNumber: 'asc' }
      }
    }
  })

  if (!book) {
    console.error(`[ExportPage] Book not found or unauthorized. BookID: ${params.id}, UserID: ${userId}`)
    notFound()
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planType: true }
  })

  // We pass hasActiveSubscription derived from planType != 'free'
  const hasActiveSubscription = user?.planType !== 'free'

  // Serialize book to avoid "Date object not supported" error in Client Component
  const serializedBook = {
    ...book,
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
    chapters: book.chapters.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString()
    }))
  }

  // Cast back to any to satisfy the strict interface or update interface in client
  return <ExportClient book={serializedBook as any} hasActiveSubscription={hasActiveSubscription} />
}
