import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any)?.id
    const bookId = context?.params?.id

    // Check if book belongs to user
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId,
      },
    })

    if (!book) {
      return NextResponse.json({ message: 'Book not found' }, { status: 404 })
    }

    // Delete book (chapters will be cascade deleted)
    await prisma.book.delete({
      where: { id: bookId },
    })

    return NextResponse.json({ message: 'Book deleted successfully' })
  } catch (error) {
    console.error('Delete book error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
