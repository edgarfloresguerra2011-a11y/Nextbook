import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any)?.id
    const bookId = params.id

    // Check Plan for Tiered Access
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { planType: true } })
    if (!user || user.planType === 'free') {
        return NextResponse.json({ 
            error: 'EPUB is a Premium feature. Upgrade to Indie or Pro.',
            code: 'PREMIUM_FEATURE'
        }, { status: 403 })
    }

    // Fetch book with chapters
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' },
        },
      },
    })

    if (!book || book.userId !== userId) {
      return NextResponse.json({ message: 'Book not found' }, { status: 404 })
    }

    // Prepare EPUB content
    const content = book.chapters.map((chapter: any) => {
      let html = `<h1>Chapter ${chapter.chapterNumber}: ${chapter.title}</h1>`
      
      // Add chapter illustration if available
      if (chapter.imageUrl) {
        html += `<img src="${chapter.imageUrl}" alt="Chapter illustration" style="max-width: 100%; height: auto; margin: 20px 0;" />`
      }
      
      // Add chapter content
      const paragraphs = chapter.content.split('\n').filter((p: string) => p.trim())
      paragraphs.forEach((paragraph: string) => {
        html += `<p>${paragraph}</p>`
      })
      
      return {
        title: `Chapter ${chapter.chapterNumber}: ${chapter.title}`,
        data: html,
      }
    })

    // Dynamic import to avoid TypeScript errors
    const Epub = (await import('epub-gen-memory')).default

    // EPUB options
    const options = {
      title: book.title,
      author: 'Nexbook-AI',
      publisher: 'Nexbook-AI',
      description: book.description,
      cover: book.coverImageUrl || undefined,
      content,
    }

    // Generate EPUB
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        // @ts-ignore
        const epub = new Epub(options, '/')
        // @ts-ignore
        epub.promise.then(
          (buffer: Buffer) => resolve(buffer),
          (error: Error) => reject(error)
        )
      } catch (error) {
        reject(error)
      }
    })

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${book.title.replace(/[^a-z0-9]/gi, '_')}.epub"`,
      },
    })
  } catch (error) {
    console.error('EPUB generation error:', error)
    return NextResponse.json(
      { message: 'Failed to generate EPUB' },
      { status: 500 }
    )
  }
}
