import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// --- 1. Generación de IMÁGENES (Prioriza APIs configuradas) ---
async function generateImage(prompt: string, apiKey?: string, replicateKey?: string): Promise<string | null> {
  const enhancedPrompt = prompt + ", professional, high quality, detailed, 8k resolution, award winning, photorealistic, cinematic lighting, no text"
  
  // 1. Replicate (Flux/NanoBanana) - Highest Quality
  if (replicateKey) {
      try {
          console.log('🎨 Attempting Replicate (FLUX) generation...')
          const output = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
              "Authorization": `Token ${replicateKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              version: "black-forest-labs/flux-schnell", 
              input: { prompt: enhancedPrompt, aspect_ratio: "1:1", output_quality: 90 }
            }),
          });
          
          if (output.ok) {
             const json = await output.json();
             // Simple polling logic for generate route
             let prediction = json;
             let attempts = 0;
             while (prediction.status !== "succeeded" && prediction.status !== "failed" && attempts < 10) {
                await new Promise(r => setTimeout(r, 1500));
                const statusRes = await fetch(prediction.urls.get, {
                    headers: { "Authorization": `Token ${replicateKey}` }
                });
                prediction = await statusRes.json();
                attempts++;
             }
             
             if (prediction.status === "succeeded" && prediction.output) {
                 const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
                 console.log('✅ Replicate/Flux image generated successfully');
                 return url;
             }
          }
      } catch (e) { console.error('Replicate Error', e) }
  }

  // 2. Try OpenAI DALL-E 3 if API key provided
  if (apiKey) {
    try {
      console.log('🎨 Attempting DALL-E 3 image generation with provided API Key...')
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: enhancedPrompt.substring(0, 1000), // DALL-E max len
          n: 1,
          size: "1024x1024",
          quality: "standard", 
          response_format: "url"
        })
      })

      if (response.ok) {
        const data = await response.json()
        const imageUrl = data.data[0]?.url
        if (imageUrl) {
          console.log('✅ DALL-E 3 image generated successfully')
          return imageUrl
        }
      } else {
        const errorText = await response.text()
        console.warn('⚠️ DALL-E 3 failed:', errorText)
      }
    } catch (error) {
      console.error('❌ DALL-E 3 exception:', error)
    }
  }

  // Fallback to Pollinations.AI with Flux model (high quality free option)
  // ONLY if no premium keys resulted in an image
  console.log('🎨 Using Pollinations.AI Flux as fallback...')
  const encodedPrompt = encodeURIComponent(enhancedPrompt)
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&width=1024&height=1024&seed=${Math.floor(Math.random() * 10000)}&model=flux&enhance=true`
}

// ... (Generate Text function remains same) ...

// --- 3. Main Handler ---
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as any)?.id
    const body = await request.json()
    const { title, genre, description, numChapters = 3 } = body

    // Buscar TODAS las configuraciones activas
    const providers = await prisma.providerConfig.findMany({
      where: { userId, isActive: true },
      orderBy: { priority: 'asc' }
    })

    // --- SELECCIÓN IMAGEN ---
    const imageConfig = providers.find((p: any) => p.provider === 'openai')
    const replicateConfig = providers.find((p: any) => p.provider === 'replicate')

    // Find Text Config... (Simplified logic for brevity in replacement)
    let requestedProvider = body.textProvider
    if (requestedProvider === 'default') requestedProvider = null
    let textConfig = requestedProvider ? providers.find((p: any) => p.provider === requestedProvider) : null
    if (!textConfig) {
        const priorityOrder = ['openai', 'anthropic', 'google', 'openrouter', 'groq']
        for (const pName of priorityOrder) {
            textConfig = providers.find((p: any) => p.provider === pName)
            if (textConfig) break;
        }
        if (!textConfig && providers.length > 0) textConfig = providers[0]
    }
    
    const activeTextConfig = textConfig;
    if (!activeTextConfig) return NextResponse.json({ message: 'No API Keys' }, { status: 400 })


    // Stream Start
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (msg: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))

        try {
          send({ status: 'progress', message: `Iniciando generación con ${activeTextConfig.provider}...` })

          // Structure Generation (Same as before)
          const structurePrompt = `Genera un índice para un libro titulado "${title}" (${genre}). Descripción: ${description}. Capítulos: ${numChapters}. Retorna SOLO un JSON válido: {"chapters": [{ "chapterNumber": 1, "title": "...", "description": "..." }]}`
          let structureJsonStr = await generateText(
            structurePrompt, 
            'Eres un arquitecto editorial experto. Responde solo JSON válido sin markdown.', 
            { provider: activeTextConfig.provider, apiKey: activeTextConfig.apiKey, model: activeTextConfig.modelName || undefined }
          )
          structureJsonStr = structureJsonStr.replace(/```json/g, '').replace(/```/g, '').trim()
          let structure
          try { structure = JSON.parse(structureJsonStr) } catch(e) { throw new Error('Error estructura IA') }

          // Cover
          send({ status: 'progress', message: 'Generando portada...' })
          const coverUrl = await generateImage(`Book cover for "${title}", ${genre}, minimal, professional`, imageConfig?.apiKey, replicateConfig?.apiKey)

          // Create Book
          const book = await prisma.book.create({
            data: { userId, title, genre, description, coverImageUrl: coverUrl, status: 'generating' }
          })

          // Chapters
          for (const chap of structure.chapters) {
             if (!chap.title) continue
             send({ status: 'progress', message: `Escribiendo ${chap.title}...` })
             
             let content = await generateText(
               `Escribe el capítulo ${chap.chapterNumber}: "${chap.title}" para el libro "${title}" (${genre}).
               Instrucciones:
               - Texto corrido novelesco de altísima calidad.
               - SIN markdown, sin negritas, sin listas.
               - Mínimo 1500 palabras.
               - Justificado y denso.`,
               'Eres un escritor humano experto. Nunca usas markdown ni listas.',
               { provider: activeTextConfig.provider, apiKey: activeTextConfig.apiKey, model: activeTextConfig.modelName || undefined }
             )
             
             // --- LIMPIEZA AGRESIVA DEL TEXTO ---
             // Eliminar cualquier residuo de markdown que la IA haya ignorado
             content = content.replace(/\*\*/g, '').replace(/###/g, '').replace(/^#+\s/gm, '').replace(/^\s*[\-\*]\s+/gm, '');

             const chapImg = await generateImage(`Illustration for "${chap.title}", ${genre}`, imageConfig?.apiKey, replicateConfig?.apiKey)

             await prisma.chapter.create({
               data: {
                 bookId: book.id,
                 chapterNumber: chap.chapterNumber,
                 title: chap.title,
                 content: content,
                 imageUrl: chapImg
               }
             })
          }

          await prisma.book.update({ where: { id: book.id }, data: { status: 'completed' } })
          send({ status: 'completed', bookId: book.id })

        } catch (err: any) {
          console.error(err)
          send({ status: 'error', message: err.message || 'Error' })
        } finally {
          controller.close()
        }
      }
    })
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
  } catch (error) {
     return NextResponse.json({ message: 'Internal Error' }, { status: 500 })
  }
}
