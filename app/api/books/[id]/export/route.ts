import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const book = await prisma.book.findUnique({
    where: { id: params.id },
    include: {
      exportSettings: true,
      integrations: true
    }
  })

  if (!book || book.userId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Parse copywriting data if it exists
  let copyData = null
  if (book.exportSettings?.copywritingData) {
    try {
      copyData = JSON.parse(book.exportSettings.copywritingData)
    } catch (e) {
      console.error('Error parsing copy data', e)
    }
  }

  return NextResponse.json({
    format: book.exportSettings?.format,
    copyData,
    integrations: book.integrations
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { action, data } = body

  // Actions: save_format, save_integration, save_copywriting

  if (action === 'save_format') {
    await prisma.exportSettings.upsert({
      where: { bookId: params.id },
      create: { bookId: params.id, format: data.format },
      update: { format: data.format }
    })
    return NextResponse.json({ success: true })
  }

  if (action === 'save_integration') {
    await prisma.marketplaceIntegration.upsert({
      where: {
        bookId_platform: {
          bookId: params.id,
          platform: data.platform
        }
      },
      create: {
        bookId: params.id,
        platform: data.platform,
        status: data.status || 'connected',
        link: data.link
      },
      update: {
        status: data.status,
        link: data.link
      }
    })
    return NextResponse.json({ success: true })
  }

  if (action === 'save_copywriting') {
     await prisma.exportSettings.upsert({
      where: { bookId: params.id },
      create: { bookId: params.id, copywritingData: JSON.stringify(data) },
      update: { copywritingData: JSON.stringify(data) }
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
