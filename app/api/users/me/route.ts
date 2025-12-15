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
    const { name, bio, website, twitter, instagram, linkedin, image } = body
    const userId = (session.user as any).id
    
    // Update user
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            ...(name && { name }),
            ...(bio && { bio }),
            ...(website && { website }),
            ...(twitter && { twitter }),
            ...(instagram && { instagram }),
            ...(linkedin && { linkedin }),
            ...(facebook && { facebook }),
            ...(tiktok && { tiktok }),
            ...(image && { image }),
        }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('[USER_UPDATE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }
        const userId = (session.user as any).id
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                name: true,
                email: true,
                image: true,
                bio: true,
                website: true,
                twitter: true,
                instagram: true,
                linkedin: true,
                facebook: true,
                tiktok: true,
                planType: true,
            }
        })
        
        return NextResponse.json(user)

    } catch (error) {
        console.error('[USER_GET]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
