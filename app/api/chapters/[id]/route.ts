import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any)?.id
    const chapterId = params.id
    const body = await request.json()
    const { content } = body

    if (!content) {
      return NextResponse.json(
        { message: 'Content is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { book: true },
    })

    if (!chapter || chapter.book.userId !== userId) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    // Update chapter
    const updatedChapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: { content },
    })

    return NextResponse.json({ chapter: updatedChapter }, { status: 200 })
  } catch (error) {
    console.error('Chapter update error:', error)
    return NextResponse.json(
      { message: 'Failed to update chapter' },
      { status: 500 }
    )
  }
}
