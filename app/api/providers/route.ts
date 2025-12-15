import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = (session.user as any)?.id
    const body = await request.json()
    const { provider, apiKey, category = 'text_generation', priority = 0, modelName } = body

    if (!provider || !apiKey || !category) {
      return NextResponse.json(
        { error: 'Proveedor, API key y categoría son requeridos' },
        { status: 400 }
      )
    }

    // Upsert provider config con soporte para modelName
    // Clean modelName to ensure it's either a string or null (not undefined)
    const validModelName = modelName || null

    // Check if exists first to avoid SQLite unique constraints issues with NULLs in upsert
    const existingConfig = await prisma.providerConfig.findFirst({
      where: {
        userId,
        provider,
        category,
        modelName: validModelName
      }
    })

    let providerConfig

    if (existingConfig) {
      providerConfig = await prisma.providerConfig.update({
        where: { id: existingConfig.id },
        data: {
          apiKey,
          priority,
          isActive: true
        }
      })
    } else {
      providerConfig = await prisma.providerConfig.create({
        data: {
          userId,
          provider,
          apiKey,
          category,
          priority,
          modelName: validModelName,
          isActive: true
        }
      })
    }

    return NextResponse.json(providerConfig, { status: 200 })
  } catch (error) {
    console.error('Provider save error:', error)
    return NextResponse.json(
      { error: 'Error al guardar proveedor: ' + (error instanceof Error ? error.message : 'Error desconocido') },
      { status: 500 }
    )
  }
}
