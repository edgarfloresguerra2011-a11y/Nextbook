import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { jsPDF } from 'jspdf'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

function wrapText(text: string, maxWidth: number, doc: any): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = doc.getTextWidth(testLine)

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any)?.id
    const bookId = context?.params?.id

    // Get book with chapters
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId,
      },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' },
        },
      },
    })

    if (!book) {
      return NextResponse.json({ message: 'Book not found' }, { status: 404 })
    }

    // Create PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const maxWidth = pageWidth - 2 * margin
    let yPosition = margin

    // Cover Page
    doc.setFillColor(59, 130, 246)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(32)
    doc.setFont('helvetica', 'bold')
    const titleLines = wrapText(book?.title || '', maxWidth - 40, doc)
    yPosition = pageHeight / 2 - (titleLines.length * 12)
    for (const line of titleLines) {
      doc.text(line, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 12
    }
    doc.setFontSize(18)
    doc.text(book?.genre || '', pageWidth / 2, yPosition + 20, { align: 'center' })

    // Table of Contents
    doc.addPage()
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Table of Contents', margin, 30)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    yPosition = 50
    for (const chapter of book?.chapters || []) {
      doc.text(
        `Chapter ${chapter?.chapterNumber}: ${chapter?.title || ''}`,
        margin,
        yPosition
      )
      yPosition += 10
    }

    // Chapters
    for (const chapter of book?.chapters || []) {
      doc.addPage()
      yPosition = margin

      // Chapter title
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      const chapterTitle = `Chapter ${chapter?.chapterNumber}: ${chapter?.title || ''}`
      doc.text(chapterTitle, margin, yPosition)
      yPosition += 15

      // Chapter content
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      const paragraphs = (chapter?.content || '').split('\n').filter((p) => p?.trim?.())

      for (const paragraph of paragraphs) {
        const lines = wrapText(paragraph, maxWidth, doc)
        for (const line of lines) {
          if (yPosition > pageHeight - margin) {
            doc.addPage()
            yPosition = margin
          }
          doc.text(line, margin, yPosition)
          yPosition += 7
        }
        yPosition += 5 // Extra space between paragraphs
      }
    }

    // Add page numbers
    const totalPages = doc.internal.pages.length - 1
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(10)
      doc.setTextColor(128, 128, 128)
      doc.text(
        `${i - 1}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    }

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer')

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${book?.title?.replace(/[^a-z0-9]/gi, '_')}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { message: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
