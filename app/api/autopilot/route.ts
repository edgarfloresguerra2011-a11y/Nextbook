import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const maxDuration = 300 // 5 minutes max for longer generations

// --- Helper Functions (Reused/Adapted from generate/route.ts) ---

// 1. TEXT GENERATION
async function generateText(
  prompt: string, 
  systemPrompt: string, 
  config: { provider: string, apiKey: string, model?: string }
): Promise<string> {
  const { provider, apiKey, model } = config

  let targetModel = model
  if (!targetModel) {
    if (provider === 'google') targetModel = 'gemini-2.0-flash-exp' // Prioritizing Flash 2.0
    else if (provider === 'openrouter') targetModel = 'google/gemini-2.0-flash-exp:free'
    else if (provider === 'openai') targetModel = 'gpt-4o-mini'
    else if (provider === 'anthropic') targetModel = 'claude-3-haiku-20240307'
    else targetModel = 'gpt-3.5-turbo'
  }

  // Google Gemini
  if (provider === 'google') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }] })
    })
    if (!response.ok) throw new Error(`Gemini Error: ${await response.text()}`)
    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  // Anthropic
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
    if (!response.ok) throw new Error(`Claude Error: ${await response.text()}`)
    const data = await response.json()
    return data.content?.[0]?.text || ''
  }

  // OpenRouter / OpenAI
  let baseUrl = 'https://api.openai.com/v1'
  let headers: Record<string, string> = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  
  if (provider === 'openrouter') {
    baseUrl = 'https://openrouter.ai/api/v1'
    headers['HTTP-Referer'] = 'https://nexbook.app'
    headers['X-Title'] = 'Nexbook AI'
    
    // Backup models if the primary fails (Rate Limit / Overloaded)
    const backupModels = [
        'meta-llama/llama-3.1-8b-instruct:free',
        'mistralai/mistral-7b-instruct:free',
        'microsoft/phi-3-mini-128k-instruct:free'
    ]

    // Function to try fetch
    const tryFetch = async (modelToTry: string) => {
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: modelToTry,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        })
        if (!res.ok) throw new Error(await res.text())
        return await res.json()
    }

    try {
        // Try primary model first
        const data = await tryFetch(targetModel)
        return data.choices?.[0]?.message?.content || ''
    } catch (e: any) {
        console.warn(`Primary model ${targetModel} failed:`, e.message)
        
        // Try backups
        for (const backup of backupModels) {
            try {
                console.log(`🔄 Switching to backup model: ${backup}`)
                const data = await tryFetch(backup)
                return data.choices?.[0]?.message?.content || ''
            } catch (retryErr) {
                continue // Try next backup
            }
        }
        throw new Error(`All OpenRouter models failed. Last error: ${e.message}`)
    }
  }

  // Standard OpenAI behavior (and compatible providers)
  if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1'
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
     const errorText = await response.text();
     throw new Error(`${provider} Error: ${errorText}`)
  }
  
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// 2. IMAGE GENERATION (Multi-Provider with Fallback)
async function generateImage(
  prompt: string, 
  imageConfigs: { provider: string, apiKey: string, model?: string }[]
): Promise<string> {
  const enhancedPrompt = prompt + ", professional photography, high quality, sharp focus, vibrant colors"
  
  for (const config of imageConfigs) {
    try {
      console.log(`[Image] Trying ${config.provider}...`)
      
      // OpenAI DALL-E
      if (config.provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
          body: JSON.stringify({
            model: config.model || "dall-e-3",
            prompt: enhancedPrompt.substring(0, 1000),
            n: 1, size: "1024x1024", quality: "standard", response_format: "url"
          })
        })
        if (response.ok) {
          const data = await response.json()
          if (data.data?.[0]?.url) return data.data[0].url
        }
      }
      
      // Together AI (Flux)
      if (config.provider === 'together') {
        const response = await fetch('https://api.together.xyz/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
          body: JSON.stringify({
            model: config.model || "black-forest-labs/FLUX.1-schnell-Free",
            prompt: enhancedPrompt,
            width: 1024, height: 1024, n: 1
          })
        })
        if (response.ok) {
          const data = await response.json()
          if (data.data?.[0]?.url) return data.data[0].url
        }
      }
      
      // Stability AI
      if (config.provider === 'stability') {
        const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
          body: JSON.stringify({
            text_prompts: [{ text: enhancedPrompt }],
            cfg_scale: 7, height: 1024, width: 1024, samples: 1
          })
        })
        if (response.ok) {
          const data = await response.json()
          if (data.artifacts?.[0]?.base64) {
            return `data:image/png;base64,${data.artifacts[0].base64}`
          }
        }
      }
      
      // Replicate (Flux)
      if (config.provider === 'replicate') {
        // Note: Replicate requires polling, so we use a simpler model
        const response = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${config.apiKey}` },
          body: JSON.stringify({
            version: "black-forest-labs/flux-schnell",
            input: { prompt: enhancedPrompt }
          })
        })
        if (response.ok) {
          const prediction = await response.json()
          // Wait for result (simplified - in production would poll)
          if (prediction.output) return prediction.output[0]
        }
      }
      
    } catch (e: any) {
      console.warn(`[Image] ${config.provider} failed:`, e.message)
    }
  }
  
  // Final Fallback: Pollinations (Free, always works)
  console.log('[Image] All providers failed, using Pollinations fallback')
  const encodedPrompt = encodeURIComponent(enhancedPrompt)
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&width=1024&height=1024&seed=${Math.floor(Math.random() * 1000)}&model=flux`
}


// --- 3. ROBUST GENERATION WITH PROVIDER CASCADE ---
async function generateWithFallback(
  prompt: string, 
  systemPrompt: string, 
  configs: any[]
): Promise<string> {
    // ... existing implementation ...
  const errors: string[] = []
  for (const config of configs) {
    try {
      console.log(`Trying provider: ${config.provider}...`)
      const result = await generateText(prompt, systemPrompt, config)
      if (result && result.length > 0) return result 
    } catch (e: any) {
      console.warn(`⚠️ Provider ${config.provider} failed: ${e.message}`)
      errors.push(`${config.provider}: ${e.message}`)
    }
  }
  throw new Error(`All AI providers failed. Details: ${errors.join(' | ')}`)
}


export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id

    // --- CHECK CREDITS & PLAN (Tiered Access) ---
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true, planType: true } })
    
    if (!user || user.credits <= 0) {
        return NextResponse.json({ error: 'Créditos insuficientes. Actualiza tu plan para continuar.', code: 'INSUFFICIENT_CREDITS' }, { status: 403 })
    }

    // Deduct Credit Immediately
    await prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: 1 } }
    })

    // --- STREAMING RESPONSE SETUP ---
    console.log('🚀 Starting Autopilot Stream logic...')
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
        async start(controller) {
            const sendUpdate = (step: string, progress: number) => {
                const message = JSON.stringify({ type: 'progress', step, progress })
                controller.enqueue(encoder.encode(message + '\n'))
            }

            try {
                // Parse Body for Language and Topic Suggestion - v2.4
                const body = await req.json().catch(() => ({}))
                const userLang = body.language || 'es'
                const topicSuggestion = body.topicSuggestion || ''
                const langMap: Record<string, string> = {
                    'es': 'Spanish (Español)',
                    'en': 'English',
                    'fr': 'French (Français)',
                    'de': 'German (Deutsch)',
                    'pt': 'Portuguese (Português)',
                    'it': 'Italian (Italiano)'
                }
                const targetLanguage = langMap[userLang] || 'Spanish (Español)'

                // 1. GET PROVIDERS
                sendUpdate('🔍 Verificando configuración de IA...', 2)
                const providers = await prisma.providerConfig.findMany({ where: { userId, isActive: true } })
                // Updated filter to include all supported text providers
                const textConfigs = providers.filter((p: any) => 
                    ['google', 'openrouter', 'openai', 'anthropic', 'groq', 'mistral', 'together', 'deepseek', 'perplexity', 'fireworks'].includes(p.provider)
                )
                const imageConfigs = providers.filter((p: any) => 
                    ['openai', 'together', 'stability', 'replicate', 'huggingface'].includes(p.provider)
                ).map((p: any) => ({ provider: p.provider, apiKey: p.apiKey, model: p.modelName }))

                if (textConfigs.length === 0) {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: 'No hay proveedores de IA configurados.' }) + '\n'))
                    controller.close()
                    return
                }

                // 2. ANALYZE TREND (Estimate Time) - v2.4 with Topic Suggestions
                // Assuming typical generation takes ~45s per chapter + 20s initial
                sendUpdate(`⏱️ Iniciando. Idioma: ${targetLanguage}. Calculando magnitud...`, 5)

                const topicInstruction = topicSuggestion 
                    ? `
CRITICAL REQUIREMENT: The book MUST be about "${topicSuggestion}". This is NOT optional.
If the user asked for "recetas de verano", the book MUST be a RECIPE BOOK with actual recipes.
If the user asked for "fitness", the book MUST be about FITNESS.
DO NOT generate a generic self-help or editorial book. MATCH THE USER'S REQUEST EXACTLY.
`
                    : 'Generate a trending non-fiction topic.'

                const planningPrompt = `
Act like a senior publishing market analyst.
${topicInstruction}

Language: ${targetLanguage} (MANDATORY: ALL content MUST be in ${targetLanguage}).
Generate a book plan. JSON ONLY:
{
  "trendAnalysis": { "topic": "...", "targetAudience": "..." },
  "bookMetadata": { "title": "...", "genre": "...", "description": "..." },
  "chapters": [ { "title": "...", "keyPoints": ["..."] }, { "title": "...", "keyPoints": ["..."] }, { "title": "...", "keyPoints": ["..."] }, { "title": "...", "keyPoints": ["..."] }, { "title": "...", "keyPoints": ["..."] } ]
}`
                
                let planJsonStr
                try {
                     planJsonStr = await generateWithFallback(planningPrompt, `You are a publishing expert. Respond ONLY in ${targetLanguage}. JSON only.`, textConfigs)
                } catch (e: any) {
                    throw new Error(`Error analizando mercado: ${e.message}`)
                }

                let plan
                try {
                    const cleanJson = planJsonStr.replace(/```json/g, '').replace(/```/g, '').trim()
                    plan = JSON.parse(cleanJson)
                } catch (e) {
                    throw new Error("La IA generó un plan inválido. Intenta de nuevo.")
                }

                // Initial estimation based on plan
                const totalChapters = plan.chapters.length
                const estimatedMins = Math.ceil(totalChapters * 0.8) 
                sendUpdate(`⏱️ Proyecto detectado: ${totalChapters} capítulos. Tiempo estimado: ~${estimatedMins} minutos. NO cierres esta pestaña.`, 10)

                // 3. CREATE BOOK
                sendUpdate(`📖 Creando estructura: ${plan.bookMetadata.title}`, 20)
                
                const coverPromise = generateImage(
                    `Book cover for "${plan.bookMetadata.title}". Context: ${plan.bookMetadata.description}. Style: ${plan.bookMetadata.genre}, professional, award winning design, minimalist typography, high resolution`,
                    imageConfigs
                )

                const book = await prisma.book.create({
                    data: {
                        userId,
                        title: plan.bookMetadata.title,
                        genre: plan.bookMetadata.genre,
                        description: plan.bookMetadata.description,
                        status: 'generating', 
                        wordCount: 0,
                        coverImageUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80' 
                    }
                })

                coverPromise.then(async (url) => {
                    await prisma.book.update({ where: { id: book.id }, data: { coverImageUrl: url } })
                }).catch(console.error)


                // 4. GENERATE CHAPTERS
                let totalWords = 0
                const chapters = plan.chapters // Use ALL planned chapters now
                const progressPerChapter = 70 / chapters.length
                let currentProgress = 25

                for (let i = 0; i < chapters.length; i++) {
                    const chapPlan = chapters[i]
                    const chapNum = i + 1
                    
                    // Clean title redundancy (Remove "Chapter 1:", "Capítulo 1:", etc.)
                    const cleanTitle = chapPlan.title.replace(/^(Chapter|Capítulo|Chapitre|Kapitel|Capitolo)\s+\d+[:.]?\s*/i, '').trim()

                    sendUpdate(`✍️ Escribiendo Cap ${chapNum}/${totalChapters}: ${cleanTitle}...`, currentProgress)

                    const contentPrompt = `
Write the FULL CONTENT for Chapter ${chapNum}: "${cleanTitle}".
Book: "${book.title}". Audience: ${plan.trendAnalysis.targetAudience}.
Key Points: ${chapPlan.keyPoints.join(', ')}.
Language: ${targetLanguage} (MANDATORY).

Requirements:
- FORMATTING: Use standard paragraphs. Text MUST be justified.
- STRICTLY FORBIDDEN: Do NOT use hashes (###) for subtitles unless absolutely necessary (max 2 per chapter).
- STRICTLY FORBIDDEN: Do NOT use bolding (**) for entire sentences.
- STRICTLY FORBIDDEN: Do NOT use lists (-) unless it is a technical set of steps.
- STRICTLY FORBIDDEN: No decorative symbols like ***, ---, or emojis.
- Tone: Professional, flowing narrative, immersive.
- Minimum 1200 words. Deep content.
- NO filler phrases. Value first.
- IMPORTANT: Return ONLY the markdown content. Do NOT repeat the Chapter Title at the top.
`
                    const content = await generateWithFallback(
                        contentPrompt,
                        `You are an experienced best-seller author writing in ${targetLanguage}.`,
                        textConfigs
                    )

                    // Generate Chapter Image
                    const chapImg = await generateImage(
                        `Editorial illustration for book chapter "${cleanTitle}". Context: ${book.title}. Style: modern line art, sophisticated, ${plan.bookMetadata.genre}, no text`,
                        imageConfigs
                    )

                    await prisma.chapter.create({
                        data: {
                            bookId: book.id,
                            chapterNumber: chapNum,
                            title: cleanTitle,
                            content: content,
                            imageUrl: chapImg 
                        }
                    })
                    totalWords += content.split(/\s+/).length
                    currentProgress += progressPerChapter
                    
                    // Force update to keep connection alive
                    sendUpdate(`✅ Cap ${chapNum} listo.`, currentProgress)
                }

                // 5. FINISH
                sendUpdate('✨ Finalizando libro y compilando...', 98)
                await prisma.book.update({
                    where: { id: book.id },
                    data: { status: 'completed', wordCount: totalWords }
                })
                
                // Done
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'done', bookId: book.id }) + '\n'))
                controller.close()

            } catch (error: any) {
                console.error("Stream Error:", error)
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: error.message }) + '\n'))
                controller.close()
            }
        }
    })

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked' 
        }
    })

  } catch (error: any) {
    console.error('Autopilot init error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
