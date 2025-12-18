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

  let book = await prisma.book.findFirst({
    where: {
      id: params?.id,
      userId,
    },
    include: {
      chapters: {
        orderBy: { number: 'asc' },
      },
    },
  }) as any

  if (book) {
      // Manual fetch for new fields if missing (due to outdated Prisma Client)
      if (!book.theme || !book.layout) {
          try {
             // Fetch raw generic fields
             const rawBooks: any = await prisma.$queryRaw`SELECT theme, layout FROM books WHERE id=${book.id} LIMIT 1`
             if (rawBooks && rawBooks[0]) {
                 book.theme = rawBooks[0].theme
                 book.layout = rawBooks[0].layout
             }
          } catch(e) { console.error("Raw fetch failed", e)}
      }
  }

  if (!book) {
    redirect('/dashboard')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planType: true }
  })

  return <BookViewerClient book={book} planType={user?.planType || 'free'} />
}
