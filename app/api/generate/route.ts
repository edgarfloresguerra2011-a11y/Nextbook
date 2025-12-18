import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { generateTextCore as generateText } from '@/lib/ai-core'

export const dynamic = 'force-dynamic'

async function generateImage(prompt: string, apiKey?: string, replicateKey?: string, replicateModel?: string, deepseekKey?: string): Promise<string | null> {
  const enhancedPrompt = prompt + ", professional, high quality, detailed, 8k resolution, award winning, photorealistic, cinematic lighting, no text";
  
  // APIs Config
  const effectiveReplicateKey = replicateKey || process.env.REPLICATE_API_TOKEN;
  const effectiveOpenAIKey = apiKey || process.env.OPENAI_API_KEY;
  const effectiveDeepSeekKey = deepseekKey || process.env.DEEPSEEK_API_KEY;

  // 0. DEEPSEEK (STRICT PRIORITY as requested)
  // User explicitly wants DeepSeek for images.
  if (effectiveDeepSeekKey) {
      try {
           console.log('🎨 Attempting DeepSeek Image Generation (Priority)...');
           const response = await fetch('https://api.deepseek.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${effectiveDeepSeekKey}`
                },
                body: JSON.stringify({
                    prompt: enhancedPrompt,
                    n: 1,
                    size: "1024x1024",
                    response_format: "url"
                })
           });
           
           if (response.ok) {
               const data = await response.json();
               if (data.data?.[0]?.url) {
                   console.log('✅ DeepSeek Image generated successfully');
                   return data.data[0].url;
               }
           } else {
               console.warn(`⚠️ DeepSeek Image Failed: ${response.status}. Trying next provider...`);
           }
      } catch (e) { console.error('DeepSeek Image Error', e) }
  }

  // 1. Replicate (Flux/Hunyuan/etc) - Highest Quality
  if (effectiveReplicateKey) {
      try {
          const modelId = replicateModel || "black-forest-labs/flux-schnell";
          console.log(`🎨 Attempting Replicate (${modelId}) generation...`)
          
          const output = await fetch(`https://api.replicate.com/v1/models/${modelId}/predictions`, {
            method: "POST",
            headers: {
              "Authorization": `Token ${effectiveReplicateKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: { prompt: enhancedPrompt }
            }),
          });
          
          if (output.ok) {
             const json = await output.json();
             // Polling logic
             let prediction = json;
             let attempts = 0;
             while (prediction.status !== "succeeded" && prediction.status !== "failed" && attempts < 10) {
                await new Promise(r => setTimeout(r, 1500));
                const statusRes = await fetch(prediction.urls.get, {
                    headers: { "Authorization": `Token ${effectiveReplicateKey}` }
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

  // 2. Try OpenAI DALL-E 3
  if (effectiveOpenAIKey) {
    try {
      console.log('🎨 Attempting DALL-E 3 image generation...')
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveOpenAIKey}`
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: enhancedPrompt.substring(0, 1000), 
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

  // REMOVED Vertex/Gemini fallback as requested by user ("No vertex call")

  // LAST RESORT
  console.warn('⚠️ All image providers failed. Returning placeholder (No Vertex used).')
  return `https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=1000`; 
}

// ... 

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
    const deepseekConfig = providers.find((p: any) => p.provider === 'deepseek')

    // 0. LOAD MASTER SECRETS FROM FILE
    let masterSecrets: any = {};
    try {
        const fs = require('fs');
        const path = require('path');
        const secretsPath = path.join(process.cwd(), '.secrets', 'apis.json');
        if (fs.existsSync(secretsPath)) {
            masterSecrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
        }
    } catch (e) {}

    // 1. MASTER SECRETS PRIORITY (Environment Variables or File)
    let textConfig = null;
    const dsKey = process.env.DEEPSEEK_API_KEY || masterSecrets.DEEPSEEK_API_KEY;
    const orKey = process.env.OPENROUTER_API_KEY || masterSecrets.OPENROUTER_API_KEY;
    const gKey = process.env.GOOGLE_API_KEY || masterSecrets.GOOGLE_API_KEY;
    const oKey = process.env.OPENAI_API_KEY || masterSecrets.OPENAI_API_KEY;

    if (dsKey) {
        textConfig = { provider: 'deepseek', apiKey: dsKey, modelName: process.env.DEEPSEEK_MODEL || 'deepseek-chat' }
    } else if (orKey) {
        textConfig = { provider: 'openrouter', apiKey: orKey, modelName: 'google/gemini-2.0-flash-exp:free' }
    } else if (gKey) {
        textConfig = { provider: 'google', apiKey: gKey, modelName: 'gemini-1.5-flash' }
    } else if (oKey) {
        textConfig = { provider: 'openai', apiKey: oKey, modelName: 'gpt-4o-mini' }
    }

    // 2. FALLBACK TO DB if no Master Secrets found
    if (!textConfig) {
        // Find Text Config in DB
        let requestedProvider = body.textProvider
        if (requestedProvider === 'default') requestedProvider = null
        textConfig = requestedProvider ? providers.find((p: any) => p.provider === requestedProvider) : null
        
        if (!textConfig) {
            const priorityOrder = ['deepseek', 'qwen', 'zhipu', 'yi', 'openai', 'anthropic', 'google', 'openrouter', 'groq']
            for (const pName of priorityOrder) {
                textConfig = providers.find((p: any) => p.provider === pName)
                if (textConfig) break;
            }
        }
    }


    const activeTextConfig = textConfig;
    if (!activeTextConfig) {
        console.error("❌ No AI Provider configured in DB or .env");
        return NextResponse.json({ message: 'No API Keys configured. Please add an API Key in Settings.' }, { status: 400 })
    }


    // Stream Start
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (msg: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))

        try {
          send({ status: 'progress', message: `Iniciando generación con ${activeTextConfig.provider}...` })

          // Structure Generation (with SEO)
          const structurePrompt = `Genera un índice para un libro titulado "${title}" (${genre}). 
          Descripción del usuario: ${description}. 
          Capítulos: ${numChapters}. 
          
          TAREA:
          1. Crea una estructura de capítulos atractiva.
          2. Genera 5-10 Palabras Clave SEO de alto tráfico para este tema.
          3. Escribe una Meta Descripción SEO optimizada (máx 160 caracteres).
          
          Retorna SOLO un JSON válido: 
          {
            "chapters": [{ "number": 1, "title": "...", "description": "Breve descripción de la escena o contenido visual del capítulo" }],
            "seoKeywords": ["keyword1", "keyword2"],
            "seoDescription": "Meta description..."
          }`
          
          let structureJsonStr = await generateText(
            structurePrompt, 
            'Eres un arquitecto editorial y experto en SEO. Responde solo JSON válido sin markdown.', 
            { provider: activeTextConfig.provider, apiKey: activeTextConfig.apiKey, model: activeTextConfig.modelName || undefined }
          )
          structureJsonStr = structureJsonStr.replace(/```json/g, '').replace(/```/g, '').trim()
          let structure
          try { structure = JSON.parse(structureJsonStr) } catch(e) { throw new Error('Error estructura IA') }

          // Cover
          send({ status: 'progress', message: 'Generando portada...' })
          const coverUrl = await generateImage(
              `Photorealistic 3D product shot of a hardcover book standing on a table. Title: "${title}". Theme: ${genre}. Professional photography, cinematic lighting`, 
              imageConfig?.apiKey || undefined, 
              replicateConfig?.apiKey || undefined, 
              replicateConfig?.modelName || undefined,
              deepseekConfig?.apiKey || undefined
          )

          // Prepare SEO Data
          const seoKeywordsStr = structure.seoKeywords && Array.isArray(structure.seoKeywords) ? structure.seoKeywords.join(', ') : '';
          const seoDesc = structure.seoDescription || '';

          // Create Book
          const book = await prisma.book.create({
            data: { 
                userId, 
                title, 
                genre, 
                category: genre, // Required in V2 schema
                description, 
                seoKeywords: seoKeywordsStr, 
                seoDescription: seoDesc,
                coverImageUrl: coverUrl, 
                status: 'generating' 
            }
          })

          // Chapters
          for (const chap of structure.chapters) {
             if (!chap.title) continue
             send({ status: 'progress', message: `Escribiendo ${chap.title}...` })
             
             let content = await generateText(
               `Escribe el capítulo ${chap.number}: "${chap.title}" para el libro "${title}" (${genre}).
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

             // --- CHAPTER IMAGE (Context Aware) ---
             const chapImgPrompt = `Detailed illustration for chapter "${chap.title}". Context: ${chap.description || 'Key scene from the chapter'}. Book Theme: ${genre}. High quality, detailed art, cinematic style, no text.`;
             const chapImg = await generateImage(
                 chapImgPrompt, 
                 imageConfig?.apiKey || undefined, 
                 replicateConfig?.apiKey || undefined, 
                 replicateConfig?.modelName || undefined,
                 deepseekConfig?.apiKey || undefined
             )

             await prisma.chapter.create({
               data: {
                 bookId: book.id,
                 number: chap.number,
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
