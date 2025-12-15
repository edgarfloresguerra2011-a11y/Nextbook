import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { language } = body

    if (!language) {
      return new NextResponse('Missing language field', { status: 400 })
    }

    const userId = (session.user as any).id
    
    await prisma.user.update({
      where: { id: userId },
      data: { language },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[USER_PREFERENCES_PATCH]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
