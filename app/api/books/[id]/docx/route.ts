import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

export const dynamic = 'force-dynamic'

export async function POST(
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
            error: 'DOCX is a Premium feature. Upgrade to Indie or Pro.',
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

    // Create DOCX document
    const children: any[] = []

    // Title page
    children.push(
      new Paragraph({
        text: book.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: book.genre,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: book.description,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: '',
        spacing: { after: 400 },
      })
    )

    // Table of Contents
    children.push(
      new Paragraph({
        text: 'Table of Contents',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    book.chapters.forEach((chapter: any) => {
      children.push(
        new Paragraph({
          text: `Chapter ${chapter.number}: ${chapter.title}`,
          spacing: { after: 100 },
        })
      )
    })

    children.push(
      new Paragraph({
        text: '',
        spacing: { after: 400 },
      })
    )

    // Chapters
    book.chapters.forEach((chapter: any) => {
      // Chapter title
      children.push(
        new Paragraph({
          text: `Chapter ${chapter.number}: ${chapter.title}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      )

      // Chapter content
      const paragraphs = chapter.content.split('\n').filter((p: string) => p.trim())
      paragraphs.forEach((paragraph: string) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: paragraph,
                size: 24, // 12pt
              }),
            ],
            spacing: { after: 200 },
          })
        )
      })

      // Add space after chapter
      children.push(
        new Paragraph({
          text: '',
          spacing: { after: 400 },
        })
      )
    })

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    })

    // Generate buffer
    const buffer = await Packer.toBuffer(doc)

    // Return as downloadable file
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${book.title.replace(/[^a-z0-9]/gi, '_')}.docx"`,
      },
    })
  } catch (error) {
    console.error('DOCX generation error:', error)
    return NextResponse.json(
      { message: 'Failed to generate DOCX' },
      { status: 500 }
    )
  }
}
