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
          orderBy: { number: 'asc' },
        },
      },
    })

    if (!book || book.userId !== userId) {
      return NextResponse.json({ message: 'Book not found' }, { status: 404 })
    }

    // Prepare EPUB content (Phase 4: KDP-Ready HTML)
    const content = book.chapters.map((chapter: any) => {
      // KDP Styling: Simple semantic HTML. No complex inline styles.
      let html = `<div class="chapter-container">`
      html += `<h1 class="chapter-title">${chapter.title}</h1>`
      
      // Add chapter illustration if available
      if (chapter.imageUrl) {
        html += `<div class="chapter-image-wrapper" style="text-align: center; margin: 2rem 0;">`
        html += `<img src="${chapter.imageUrl}" alt="${chapter.title}" style="max-width: 100%; height: auto;" />`
        html += `</div>`
      }
      
      // Add chapter content - Ensure paragraphs are properly wrapped
      const paragraphs = chapter.content.split('\n').filter((p: string) => p.trim())
      paragraphs.forEach((paragraph: string) => {
        // Remove manual markdown artifacts if any slipped through
        const cleanText = paragraph.replace(/^#+\s*/, '').replace(/\*\*/g, ''); 
        html += `<p class="chapter-text">${cleanText}</p>`
      })
      
      html += `</div>`
      
      return {
        title: chapter.title, // Table of Contents Label
        data: html,
      }
    })

    // Dynamic import to avoid TypeScript errors
    const Epub = (await import('epub-gen-memory')).default

    // EPUB options (Using Marketing Data)
    const options = {
      title: book.title, // Optimized SEO Title
      author: user.authorName || 'NexBook AI Author', // User's Pen Name
      publisher: 'NexBook AI Publishing', // Or user defined
      description: book.description, // The "Sales Synopsis" from Marketing Agent
      cover: book.coverImageUrl || undefined,
      tocTitle: 'Índice de Contenido',
      ignoreFailedDownloads: true, // Prevent crash if image url is 404
      verbose: true,
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
    return new NextResponse(buffer as any, {
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
