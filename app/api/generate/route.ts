import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// --- 1. Generación de IMÁGENES (Prioriza APIs configuradas) ---
async function generateImage(prompt: string, apiKey?: string): Promise<string | null> {
  // Enhance prompt for better quality
  const enhancedPrompt = prompt + ", professional, high quality, detailed, 8k resolution, award winning, photorealistic, cinematic lighting"
  
  // Try OpenAI DALL-E 3 if API key provided
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
          quality: "hd", 
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
        console.warn('⚠️ DALL-E 3 failed (Falling back to Pollinations):', errorText)
      }
    } catch (error) {
      console.error('❌ DALL-E 3 exception:', error)
    }
  } else {
      console.log('ℹ️ No OpenAI API Key provided for images. Skipping DALL-E 3.')
  }

  // Fallback to Pollinations.AI with Flux model (high quality free option)
  console.log('🎨 Using Pollinations.AI Flux as fallback...')
  const encodedPrompt = encodeURIComponent(enhancedPrompt)
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&width=1024&height=1024&seed=${Math.floor(Math.random() * 10000)}&model=flux&enhance=true`
}

// --- 2. Generación de TEXTO (Soporta OpenAI, OpenRouter, Gemini, Anthropic) ---
async function generateText(
  prompt: string, 
  systemPrompt: string, 
  config: { provider: string, apiKey: string, model?: string }
): Promise<string> {
  const { provider, apiKey, model } = config

  // === A. Configuración de Modelos por Defecto ===
  let targetModel = model
  if (!targetModel) {
    switch (provider) {
      case 'openai': targetModel = 'gpt-4o'; break;
      case 'anthropic': targetModel = 'claude-3-haiku-20240307'; break;
      case 'google': targetModel = 'gemini-1.5-flash'; break;
      case 'openrouter': targetModel = 'google/gemini-2.0-flash-exp:free'; break; 
      default: targetModel = 'gpt-3.5-turbo';
    }
  }

  // === B. Lógica por Proveedor ===

  // 1. Google Gemini
  if (provider === 'google') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }]
      })
    })
    
    if (!response.ok) {
        const errText = await response.text()
        console.error('Gemini API Error:', errText)
        throw new Error(`Gemini Error: ${errText}`)
    }
    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  // 2. Anthropic Claude
  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: targetModel,
        max_tokens: 4000,
        messages: [{ role: 'user', content: `${systemPrompt}\n\n${prompt}` }]
      })
    })

    if (!response.ok) {
        const errText = await response.text()
        console.error('Anthropic API Error:', errText)
        throw new Error(`Claude Error: ${errText}`)
    }
    const data = await response.json()
    return data.content?.[0]?.text || ''
  }

  // 3. OpenAI Compatible (OpenAI, OpenRouter, Groq, etc.)
  let baseUrl = 'https://api.openai.com/v1'
  let headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }

  if (provider === 'openrouter') {
      baseUrl = 'https://openrouter.ai/api/v1'
      headers['HTTP-Referer'] = 'https://nexbook.app'
      headers['X-Title'] = 'Nexbook AI'
  }
  else if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1'
  else if (provider === 'mistral') baseUrl = 'https://api.mistral.ai/v1'
  else if (provider === 'together') baseUrl = 'https://api.together.xyz/v1'
  else if (provider === 'deepseek') baseUrl = 'https://api.deepseek.com'
  else if (provider === 'perplexity') baseUrl = 'https://api.perplexity.ai'
  else if (provider === 'fireworks') baseUrl = 'https://api.fireworks.ai/inference/v1'

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: targetModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  })

  if (!response.ok) {
      const errText = await response.text()
      console.error('OpenAI/Router API Error:', errText)
      throw new Error(`${provider} Error: ${errText}`)
  }
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}


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

    console.log(`[Generate] User ${userId} active providers: ${providers.map((p: any) => p.provider).join(', ')}`)

    // --- SELECCIÓN TEXTO ---
    let requestedProvider = body.textProvider
    if (requestedProvider === 'default') requestedProvider = null

    // 1. Busca el solicitado
    let textConfig = requestedProvider ? providers.find((p: any) => p.provider === requestedProvider) : null
    
    // 2. Si no hay solicitado o no se encuentra, busca el mejor disponible (priorizando calidad)
    if (!textConfig) {
        const priorityOrder = ['openai', 'anthropic', 'google', 'openrouter', 'groq']
        for (const pName of priorityOrder) {
            textConfig = providers.find((p: any) => p.provider === pName)
            if (textConfig) break;
        }
        // 3. Si aun no hay, cualquiera
        if (!textConfig && providers.length > 0) textConfig = providers[0]
    }

    // --- SELECCIÓN IMAGEN (CRÍTICO) ---
    // El usuario quiere DALL-E si tiene la key de OpenAI.
    const imageConfig = providers.find((p: any) => p.provider === 'openai')
    
    if (imageConfig) {
        console.log('✅ OpenAI Image Provider FOUND. Will attempt DALL-E generation.')
    } else {
        console.warn('⚠️ No OpenAI provider found for images. Will use Pollinations.')
    }

    // Fail fast if no provider for text
    if (!textConfig) {
      console.error('❌ No active API key found for text generation.')
      return NextResponse.json(
        { message: 'Error Crítico: No tienes ninguna API Key configurada. Ve a Configuración y añade OpenAI o Google Gemini.' }, 
        { status: 400 }
      )
    }

    // Stream Start
    const activeTextConfig = textConfig
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (msg: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))

        try {
          send({ status: 'progress', message: `Iniciando generación de texto con ${activeTextConfig.provider}...` })

          // --- Estructura ---
          const structurePrompt = `
Genera un índice para un libro titulado "${title}" (${genre}).
Descripción: ${description}
Capítulos: ${numChapters}

Retorna SOLO un JSON válido:
{
  "chapters": [
    { "chapterNumber": 1, "title": "...", "description": "..." }
  ]
}`
          let structureJsonStr = await generateText(
            structurePrompt, 
            'Eres un arquitecto editorial experto. Responde solo JSON válido sin markdown.', 
            { provider: activeTextConfig.provider, apiKey: activeTextConfig.apiKey, model: activeTextConfig.modelName || undefined }
          )

          // Limpieza de JSON
          structureJsonStr = structureJsonStr.replace(/```json/g, '').replace(/```/g, '').trim()
          let structure
          try {
            structure = JSON.parse(structureJsonStr)
          } catch(e) {
             console.error('Failed to parse structure:', structureJsonStr)
             throw new Error('La IA generó una estructura inválida. Intenta nuevamente.')
          }

          // --- Portada ---
          send({ status: 'progress', message: 'Generando portada...' })
          // Pasamos la apiKey de imagen explícitamente
          const coverUrl = await generateImage(`Book cover for "${title}", ${genre}, minimal, professional`, imageConfig?.apiKey)

          // Crear Libro
          const book = await prisma.book.create({
            data: {
              userId,
              title,
              genre,
              description,
              coverImageUrl: coverUrl,
              status: 'generating'
            }
          })

          // --- Capítulos ---
          for (const chap of structure.chapters) {
             if (!chap.title) continue

             send({ status: 'progress', message: `Escribiendo ${chap.title}...` })
             
             // --- PROMPT OPTIMIZADO PARA "HUMANIZACIÓN" ---
             const content = await generateText(
               `Tu misión es escribir el capítulo ${chap.chapterNumber}: "${chap.title}" para el libro "${title}" (Género: ${genre}).

               INSTRUCCIONES DE HUMANIZACIÓN (NIVEL EXPERTO):
               1. 🚫 CERO ESTRUCTURA ROBÓTICA. Prohibido usar: "En este capítulo", "En conclusión", "Es importante notar".
               2. 🚫 CERO MARKDOWN DECORATIVO. Prohibido usar asteriscos (*), guiones de lista (-) o negritas (**). Solo párrafos puros.
               3. 🚫 CERO REPETICIÓN. No repitas el título del capítulo al inicio.
               
               ESTILO DE ESCRITURA:
               - Escribe como un novelista o ensayista experimentado.
               - Flujo de conciencia natural, transiciones suaves entre párrafos.
               - Párrafos largos y densos en significado (mínimo 8 líneas por párrafo).
               - Extensión mínima: 1500 palabras reales.
               
               Si el texto parece un resumen de Wikipedia, habrás fallado.`,
               'Eres un escritor fantasma de élite. Tu escritura es indistinguible de la humana. Odias las listas y los puntos clave.',
               { provider: activeTextConfig.provider, apiKey: activeTextConfig.apiKey, model: activeTextConfig.modelName || undefined }
             )

             const chapImg = await generateImage(`Illustration for "${chap.title}", ${genre}`, imageConfig?.apiKey)

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
          send({ status: 'error', message: err.message || 'Error desconocido' })
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
  } catch (error) {
    console.error('Server Error:', error)
    return NextResponse.json({ message: 'Internal Error' }, { status: 500 })
  }
}
