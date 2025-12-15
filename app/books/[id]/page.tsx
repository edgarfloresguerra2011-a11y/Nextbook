import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { BookViewerClient } from './_components/book-viewer-client'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: {
    id: string
  }
}

export default async function BookPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  const userId = (session.user as any)?.id

  const book = await prisma.book.findFirst({
    where: {
      id: params?.id,
      userId,
    },
    include: {
      chapters: {
        orderBy: { chapterNumber: 'asc' },
      },
    },
  })

  if (!book) {
    redirect('/dashboard')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planType: true }
  })

  return <BookViewerClient book={book} planType={user?.planType || 'free'} />
}
