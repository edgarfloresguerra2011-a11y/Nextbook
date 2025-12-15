import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Attempts to upgrade user:', session.user.email)
    
    // Activar Plan Pro
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        planType: 'pro',
        credits: 500, // Dar 500 créditos
        creditsResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Reset en 30 días
      }
    })

    console.log('User upgraded successfully:', updatedUser)
    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error: any) {
    console.error('DEBUG UPGRADE ERROR:', error)
    return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 })
  }
}
