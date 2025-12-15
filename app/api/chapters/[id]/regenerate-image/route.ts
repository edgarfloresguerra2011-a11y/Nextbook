import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const chapterId = params.id
  const userId = (session.user as any).id

  // 1. Obtener información
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { book: true }
  })

  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })

  // 2. Verificar Créditos
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.credits < 1) {
      return NextResponse.json({ error: 'Créditos insuficientes' }, { status: 403 })
  }

  // 3. Obtener Configuración de Proveedores (Prioridad OpenAI para Imágenes)
  const providers = await prisma.providerConfig.findMany({
    where: { userId, isActive: true }
  })
  
  // Buscar config de OpenAI
  const imageConfig = providers.find((p: any) => p.provider === 'openai')

  const prompt = `Editorial illustration for book chapter "${chapter.title}". Context: ${chapter.book.title}. Style: modern, sophisticated, ${chapter.book.genre}, professional photography, 8k, cinematic lighting, no text`
  
  let newImageUrl = ''

  // 4. Intentar generar con DALL-E 3 si existe API Key
  if (imageConfig?.apiKey) {
      try {
          console.log('[Regen] Intentando generar con DALL-E 3...')
          const response = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${imageConfig.apiKey}`
              },
              body: JSON.stringify({
                  model: "dall-e-3",
                  prompt: prompt.substring(0, 1000),
                  n: 1,
                  size: "1024x1024",
                  quality: "hd",
                  response_format: "url"
              })
          })

          if (response.ok) {
              const data = await response.json()
              if (data.data?.[0]?.url) {
                  newImageUrl = data.data[0].url
                  console.log('[Regen] Éxito con DALL-E 3')
                  
                  // Descontar crédito SOLO si usamos DALL-E (Costoso)
                  await prisma.user.update({ where: { id: userId }, data: { credits: { decrement: 1 } } })
              }
          } else {
              console.warn('[Regen] Falló DALL-E 3:', await response.text())
          }
      } catch (e) {
          console.error('[Regen] Error DALL-E 3:', e)
      }
  }

  // 5. Fallback a Pollinations (Si falló DALL-E o no hay key)
  if (!newImageUrl) {
      console.log('[Regen] Usando Fallback Pollinations...')
      const encodedPrompt = encodeURIComponent(prompt)
      // Usar modelo Flux de Pollinations para mejor calidad
      newImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&width=1024&height=1024&seed=${Math.floor(Math.random() * 10000)}&model=flux&enhance=true`
  }

  // 6. Actualizar Capítulo
  await prisma.chapter.update({
      where: { id: chapterId },
      data: { imageUrl: newImageUrl }
  })

  return NextResponse.json({ success: true, imageUrl: newImageUrl })
}
