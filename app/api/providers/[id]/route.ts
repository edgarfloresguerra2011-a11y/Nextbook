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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = (session.user as any)?.id
    const providerId = params.id
    const body = await request.json()
    const { isActive } = body

    // Verify ownership
    const provider = await prisma.providerConfig.findUnique({
      where: { id: providerId },
    })

    if (!provider || provider.userId !== userId) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }

    // Update provider
    const updatedProvider = await prisma.providerConfig.update({
      where: { id: providerId },
      data: { isActive },
    })

    return NextResponse.json(updatedProvider, { status: 200 })
  } catch (error) {
    console.error('Provider update error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar proveedor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = (session.user as any)?.id
    const providerId = params.id

    // Verify ownership
    const provider = await prisma.providerConfig.findUnique({
      where: { id: providerId },
    })

    if (!provider || provider.userId !== userId) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }

    // Delete provider
    await prisma.providerConfig.delete({
      where: { id: providerId },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Provider delete error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar proveedor' },
      { status: 500 }
    )
  }
}
