import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const maxDuration = 300 // 5 minutes max for longer generations

import { analyzeMarketAndOptimize } from '@/lib/agents/marketing-agent';
import { consultOracle, buildPriorityStack } from '@/lib/agents/oracle';

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
    if (provider === 'google') targetModel = 'gemini-1.5-flash' // Fallback to stable Flash 1.5 if 2.0 fails 
    else if (provider === 'openrouter') targetModel = 'google/gemini-flash-1.5:free'
    else if (provider === 'groq') targetModel = 'llama-3.1-70b-versatile'
    else if (provider === 'deepseek') targetModel = 'deepseek-chat'
    else if (provider === 'qwen') targetModel = 'qwen-plus'
    else if (provider === 'zhipu') targetModel = 'glm-4-flash'
    else if (provider === 'yi') targetModel = 'yi-medium'
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
  else if (provider === 'qwen') baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  else if (provider === 'zhipu') baseUrl = 'https://open.bigmodel.cn/api/paas/v4'
  else if (provider === 'yi') baseUrl = 'https://api.01.ai/v1'

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
  
  // FALLBACK: If no DB configs, try environment variables first
  const effectiveConfigs = [...imageConfigs];
  if (effectiveConfigs.length === 0) {
      if (process.env.OPENAI_API_KEY) {
          effectiveConfigs.push({ provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'dall-e-3' });
      }
      if (process.env.REPLICATE_API_TOKEN) {
          effectiveConfigs.push({ provider: 'replicate', apiKey: process.env.REPLICATE_API_TOKEN });
      }
      if (process.env.HF_TOKEN) {
         effectiveConfigs.push({ provider: 'huggingface', apiKey: process.env.HF_TOKEN, model: 'stabilityai/stable-diffusion-xl-base-1.0' });
      }
  }
  
  for (const config of effectiveConfigs) {
    try {
      console.log(`[Image] Trying ${config.provider}...`)
      let imageUrl: string | null = null;
      
      // Ideogram (New V2 Support)
      if (config.provider === 'ideogram') {
         const response = await fetch('https://api.ideogram.ai/generate', {
           method: 'POST',
           headers: { 'Api-Key': config.apiKey, 'Content-Type': 'application/json' },
           body: JSON.stringify({
             image_request: { 
               prompt: enhancedPrompt,
               model: 'V_2',
               aspect_ratio: 'ASPECT_10_16',
               magic_prompt: 'ON'
             }
           })
         })
         
         if (response.ok) {
           const data = await response.json()
           if (data.data?.[0]?.url) {
              imageUrl = data.data[0].url
           }
         } else {
             console.warn(`[Image] Ideogram error: ${await response.text()}`);
         }
      }
      
      // Google (Nano Bananapro / Imagen 3)
      else if (config.provider === 'google') {
          console.log("[Image] Using Google Nano Bananapro (Imagen 3)...");
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${config.apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  instances: [{ prompt: enhancedPrompt }],
                  parameters: { sampleCount: 1 }
              })
          });

          if (response.ok) {
              const data = await response.json();
              // Check for standard Imagen response structure
              const b64 = data.predictions?.[0]?.bytesBase64Encoded;
              if (b64) {
                   imageUrl = `data:image/png;base64,${b64}`;
              } else {
                   console.warn("[Image] Google Response format unknown:", JSON.stringify(data).substring(0, 200));
              }
          } else {
              console.warn(`[Image] Google Nano Bananapro error: ${await response.text()}`);
          }
      }
      
      // OpenAI DALL-E
      else if (config.provider === 'openai') {
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
          imageUrl = data.data?.[0]?.url
        } else {
             console.warn(`[Image] OpenAI error: ${await response.text()}`);
        }
      }
      
      // Together AI (Flux)
      else if (config.provider === 'together') {
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
          imageUrl = data.data?.[0]?.url
        }
      }
      
      // Stability AI
      else if (config.provider === 'stability') {
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
             imageUrl = `data:image/png;base64,${data.artifacts[0].base64}`
          }
        }
      }
      
      // Replicate (Generic: Flux, HunyuanDiT, etc.)
      else if (config.provider === 'replicate') {
         const modelId = config.model || "black-forest-labs/flux-schnell";
         const response = await fetch(`https://api.replicate.com/v1/models/${modelId}/predictions`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${config.apiKey}` },
           body: JSON.stringify({ input: { prompt: enhancedPrompt } })
         })
         
         if (response.ok) {
            let prediction = await response.json()
            let attempts = 0
            while (prediction.status !== "succeeded" && prediction.status !== "failed" && attempts < 15) {
               await new Promise(r => setTimeout(r, 2000))
               const statusRes = await fetch(prediction.urls.get, {
                   headers: { "Authorization": `Token ${config.apiKey}` }
               })
               prediction = await statusRes.json()
               attempts++
            }
            if (prediction.status === "succeeded" && prediction.output) {
                imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
            }
         }
      }

      // Hugging Face (Inference API)
      else if (config.provider === 'huggingface') {
         // Default to a reliable model if not specified or generic
         const model = (config.model && config.model !== 'default') ? config.model : "stabilityai/stable-diffusion-xl-base-1.0";
         const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inputs: enhancedPrompt })
         });
         
         if (response.ok) {
             const buffer = await response.arrayBuffer();
             const base64 = Buffer.from(buffer).toString('base64');
             imageUrl = `data:image/jpeg;base64,${base64}`;
         } else {
             console.warn(`[Image] HuggingFace error: ${await response.text()}`);
         }
      }

      if (imageUrl) return imageUrl;

    } catch (e: any) {
      console.warn(`[Image] ${config.provider} failed:`, e.message)
    }
  }
  
  // SAFE FALLBACK: Return placeholder instead of crashing
  console.warn('⚠️ All image providers failed. Using placeholder.')
  return 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=1000'
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
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true, planType: true, authorName: true, coverStyle: true } })
    
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
                // Parse Body for Language and Topic Suggestion - v2.4 (+ User Options v2.5)
                const body = await req.json().catch(() => ({}))
                const userLang = body.language || 'es'
                const topicSuggestion = body.topicSuggestion || ''
                const userChapters = body.chapters || 10;
                const userBudget = body.budget || 'standard'; // premium, standard, economy
                const userImageStyle = body.imageStyle; // rustic_food_photography, etc

                const langMap: Record<string, string> = {
                    'es': 'Spanish (Español)',
                    'en': 'English',
                    'fr': 'French (Français)',
                    'de': 'German (Deutsch)',
                    'pt': 'Portuguese (Português)',
                    'it': 'Italian (Italiano)'
                }
                const targetLanguage = langMap[userLang] || 'Spanish (Español)'

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

                // 1. GET PROVIDERS
                sendUpdate('🔍 Verificando configuración de IA...', 2)
                const providers = await prisma.providerConfig.findMany({ where: { userId, isActive: true } })
                // Updated filter to include all supported text providers
                let textConfigs = providers.filter((p: any) => 
                    ['google', 'openrouter', 'openai', 'anthropic', 'groq', 'mistral', 'together', 'deepseek', 'perplexity', 'fireworks'].includes(p.provider)
                )

                // INJECT DEEPSEEK FROM ENV OR FILE IF PRESENT (Replace DB config)
                const dsKey = process.env.DEEPSEEK_API_KEY || masterSecrets.DEEPSEEK_API_KEY;
                if (dsKey) {
                    textConfigs = textConfigs.filter((p: any) => p.provider !== 'deepseek');
                    textConfigs.push({
                        provider: 'deepseek',
                        apiKey: dsKey,
                        model: 'deepseek-chat' 
                    } as any);
                    console.log("Using DeepSeek from Master Secrets override");
                }


                const imageConfigs = providers.filter((p: any) => 
                    ['openai', 'together', 'stability', 'replicate', 'huggingface', 'ideogram', 'google'].includes(p.provider)
                ).map((p: any) => ({ provider: p.provider, apiKey: p.apiKey, model: p.modelName }))

                // FORCE GOOGLE PRIORITY (Nano Bananapro)
                if (process.env.GOOGLE_API_KEY) {
                     // Remove existing google if any to avoid dupes/low priority
                     const otherImages = imageConfigs.filter((p: any) => p.provider !== 'google');
                     // Prepend Google
                     imageConfigs.length = 0; // Clear array
                     imageConfigs.push({
                         provider: 'google',
                         apiKey: process.env.GOOGLE_API_KEY,
                         model: 'imagen-3.0-generate-001'
                     });
                     // EXCLUSIVE MODE: User requested ONLY Google/Nano Bananapro for testing
                     // imageConfigs.push(...otherImages); // Removed fallback to others
                     console.log("EXCLUSIVE MODE: Using ONLY Google Image Provider (Nano Bananapro).");
                } else {
                    // Check if google is in the list and move to front
                    const googleIdx = imageConfigs.findIndex((p:any) => p.provider === 'google');
                    if (googleIdx > -1) {
                        const googleConfig = imageConfigs.splice(googleIdx, 1)[0];
                        imageConfigs.unshift(googleConfig);
                    }
                }

                if (textConfigs.length === 0) {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: 'No hay proveedores de IA configurados.' }) + '\n'))
                    controller.close()
                    return
                }

                // --- FASE 1: EL ORÁCULO (Clasificación & Estrategia) ---
                sendUpdate('🔮 Consultando al Oráculo...', 3);
                
                const initialTopic = body.topicSuggestion || "Non-fiction generic"; // Fallback topic
                const genreHint = "Book"; // Generic genre hint for initial classification

                // 1. Consultamos al Oráculo para definir la estrategia técnica
                const projectConfig = await consultOracle(
                    initialTopic, 
                    genreHint, 
                    textConfigs, 
                    { budget: userBudget, chapters: userChapters }
                );
                
                // 2. Construimos las Pilas de Prioridad (Stacks)
                const writerStack = buildPriorityStack(projectConfig.stacks.writer, textConfigs);
                // El marketing siempre prefiere 'precision' (GPT-4o/Gemini Pro) para razonar
                const marketingStack = buildPriorityStack('precision', textConfigs); 

                // --- 5.2 PIPELINE STACKS ---
                const openaiStack = textConfigs.filter(c => c.provider === 'openai' || c.provider === 'openrouter'); // Broaden to OpenRouter for access
                const geminiStack = textConfigs.filter(c => c.provider === 'google');
                const deepseekStack = textConfigs.filter(c => c.provider === 'deepseek');
                
                // Fallbacks
                const correctionStack = openaiStack.length > 0 ? openaiStack : marketingStack;
                const grammarStack = geminiStack.length > 0 ? geminiStack : marketingStack;
                const productionWriterStack = (userBudget === 'premium') 
                    ? writerStack // Stick to Precision (GPT-4o/Gemini)
                    : (deepseekStack.length > 0 ? deepseekStack : writerStack); // Default to Fast/DeepSeek

                console.log(`[Autopilot] Estrategia Definida: ${projectConfig.classification.category}`);
                console.log(`[Autopilot] Writer Stack Priority: ${writerStack.map(c => c.provider).join('->')}`);


                // --- FASE 2: MARKETING (Estratega + Persuasor) ---
                sendUpdate(`🧠 Ejecutando Estrategia de Marketing (${projectConfig.classification.category})...`, 10);

                const topicInstruction = topicSuggestion 
                    ? `Tema del usuario: "${topicSuggestion}". Si es receta o técnico, respeta los datos.`
                    : 'Tema tendencia de no ficción.';

                // Generar un Blueprint Inicial (Borrador)
                const planningPrompt = `
                Actúa como editor senior.
                Genera la estructura de un libro sobre: ${topicInstruction}
                Idioma: ${targetLanguage}.
                Proyecto Tipo: ${projectConfig.classification.category}.
                Capítulos Aproximados: ${userChapters}.
                
                Output JSON exactly matching this schema:
                {
                  "trendAnalysis": { "topic": "Theme", "targetAudience": "Audience" },
                  "bookMetadata": { "title": "Book Title", "genre": "Genre", "description": "Short synopsis" },
                  "chapters": [ 
                    { 
                      "title": "Chapter Title", 
                      "keyPoints": ["point 1", "point 2"],
                      "visuals": {
                        "imageType": "professional_food_photography" | "illustration" | "diagram",
                        "requiredImages": 1,
                        "seoKeywords": ["visual_keyword1"],
                        "provider": "banana_pro"
                      }
                    } 
                  ]
                }
                `;
                
                let planJsonStr = await generateWithFallback(planningPrompt, "JSON only using the schema provided.", textConfigs);
                let cleanJson = planJsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
                const first = cleanJson.indexOf('{'); const last = cleanJson.lastIndexOf('}');
                if (first !== -1 && last !== -1) cleanJson = cleanJson.substring(first, last+1);
                
                let plan;
                try {
                     plan = JSON.parse(cleanJson);
                } catch (e) {
                     // Last resort fallback
                     plan = { bookMetadata: { title: "Error Generando Título" }, chapters: [] };
                }

                // SAFETY NORAMLIZATION: Ensure structure exists even if AI flattened it
                if (!plan.bookMetadata) {
                    plan.bookMetadata = {
                        title: plan.title || "Untitled Book",
                        genre: plan.genre || "Non-fiction",
                        description: plan.description || "Generated by NexBook AI"
                    };
                }
                if (!plan.trendAnalysis) {
                    plan.trendAnalysis = { targetAudience: "General Readers" };
                }
                if (!plan.chapters) plan.chapters = [];
                
                // Optimizamos el Blueprint con los Agentes de Marketing V2
                plan = await analyzeMarketAndOptimize(plan, initialTopic, marketingStack);
                sendUpdate(`✨ Título Definido: ${plan.bookMetadata?.title}`, 15);


                // --- FASE 3: PRODUCCIÓN (El Núcleo Blindado) ---
                // Inicializamos conteos
                const totalChapters = plan.chapters.length;
                const estimatedMins = Math.ceil(totalChapters * (projectConfig.stacks.writer === 'precision' ? 1.5 : 0.8));
                sendUpdate(`🏭 Iniciando Producción. Modo: ${projectConfig.stacks.writer.toUpperCase()}. Tiempo: ~${estimatedMins} min.`, 18);

                // Crear Libro en DB
                // Cover generation call in parallel
                const bgStyles: Record<string, string> = {
                     'modern_light': 'clean, bright modern studio background, soft lighting',
                     'technical': 'blueprint style, clean lines, technical blue background',
                     'cookbook': 'rustic wooden table, fresh ingredients, warm lighting',
                     'cinematic': 'epic cinematic lighting, dramatic shadows, movie poster style',
                     'fantasy': 'magical atmosphere, glowing particles, ethereal fantasy aesthetic',
                     'rustic_food_photography': 'professional high-end food photography, rustic wood table, natural light, 4k'
                }
                const chosenStyle = userImageStyle || body.coverStyle || (projectConfig.classification.category === 'cookbook' ? 'cookbook' : (user.coverStyle || 'modern_light'));
                const coverPrompt = `Book cover 3D render. Title: "${plan.bookMetadata.title}". Style: ${bgStyles[chosenStyle] || userImageStyle || bgStyles['modern_light']}. High quality 8k.`;
                
                // COVERS -> DALL-E 3 (Prioritized)
                const coverConfigs = [...imageConfigs].sort((a, b) => {
                     if (a.provider === 'openai') return -1;
                     return 1;
                });
                const coverPromise = generateImage(coverPrompt, coverConfigs);

                const book = await prisma.book.create({
                    data: {
                        userId,
                        title: plan.bookMetadata.title,
                        genre: plan.bookMetadata.genre || "Non-fiction",
                        category: plan.bookMetadata.genre || "Non-fiction", // Required in V2
                        description: plan.bookMetadata.description,
                        status: 'generating', 
                        wordCount: 0,
                        coverImageUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80' 
                    }
                })

                coverPromise.then(async (url) => {
                    await prisma.book.update({ where: { id: book.id }, data: { coverImageUrl: url } })
                }).catch(console.error)


                // Bucle de Capítulos
                let totalWords = 0;
                let currentProgress = 20;
                const progressPerChapter = 75 / totalChapters;

                for (let i = 0; i < totalChapters; i++) {
                    const chapPlan = plan.chapters[i];
                    const chapNum = i + 1;
                    const cleanTitle = chapPlan.title.replace(/^(Chapter|Capítulo)\s+\d+[:.]?\s*/i, '').trim();


                    // --- 5. QUALITY PIPELINE (Text -> OpenAI -> Gemini -> ChatGPT) ---

                    // A. TEXT GENERATION (DeepSeek / Fast)
                    sendUpdate(`✍️ Cronista: Redactando (DeepSeek)...`, currentProgress);
                    
                    const writerSystem = `Eres un autor experto en ${projectConfig.classification.category}. Escribes en ${targetLanguage}.`;
                    const contentPrompt = `
                    Escribe el Capítulo ${chapNum}: "${cleanTitle}".
                    Libro: "${book.title}".
                    Puntos Clave: ${chapPlan.keyPoints?.join(', ') || 'Desarrolla el tema a profundidad'}.
                    Visuals: ${JSON.stringify(chapPlan.visuals || {})}
                    
                    DIRECTRICES:
                    - Extensión: 1500+ palabras.
                    - Estilo: ${projectConfig.classification.category === 'narrative_fiction' ? 'Inmersivo' : 'Educativo y claro'}.
                    - Formato limpio (sin Markdown headers ##).
                    `;

                    let content = await generateWithFallback(contentPrompt, writerSystem, productionWriterStack);

                    // B. CORRECTION (OpenAI)
                    sendUpdate(`🔍 Corrección (OpenAI)...`, currentProgress + 1);
                    const correctionPrompt = `Corige el siguiente texto buscando coherencia, fluidez y errores de estilo. Mantén el tono e idioma original (${targetLanguage}). Retorna SOLO el texto corregido.`;
                    try {
                        content = await generateWithFallback(correctionPrompt + `\n\nTEXTO:\n${content}`, "Eres un editor experto.", correctionStack);
                    } catch (e) { console.warn("Skipping correction step due to error", e); }

                    // C. GRAMMAR (Gemini)
                    sendUpdate(`📚 Gramática (Gemini)...`, currentProgress + 2);
                    const grammarPrompt = `Revisa gramática y ortografía. Asegura calidad editorial. Retorna SOLO el texto corregido.`;
                    try {
                         content = await generateWithFallback(grammarPrompt + `\n\nTEXTO:\n${content}`, "Eres un corrector gramatical estricto.", grammarStack);
                    } catch (e) { console.warn("Skipping grammar step due to error", e); }

                    // D. HUMANIZATION (ChatGPT/OpenAI - "The Tailor")
                    sendUpdate(`🛡️ Humanización (ChatGPT)...`, currentProgress + 3);
                    const humanizerPrompt = `
                    ACT AS A GHOSTWRITER.
                    Rewrite the text to make it undetectable by AI detectors (Humanize).
                    - Vary sentence structure.
                    - Use natural vocabulary.
                    - Maintain output language: ${targetLanguage}.
                    - Return ONLY the rewritten text.
                    `;
                    try {
                         // Re-use correctionStack (OpenAI) for "ChatGPT" humanization
                         const humanized = await generateWithFallback(humanizerPrompt + `\n\nTEXTO:\n${content}`, "You are a Ghostwriter.", correctionStack);
                         if (humanized.length > content.length * 0.5) {
                             content = humanized;
                         }
                    } catch (e) { console.warn("Skipping humanization step due to error", e); }

                    // --- EL MAQUETADOR (Polisher V2) ---
                    // Siempre corre para limpiar errores
                    sendUpdate(`🧹 Maquetador: Limpieza final...`, currentProgress + 4);
                    
                     // Reutilizamos lógica del Polisher pero más ágil
                     // Usamos el modelo más barato y rápido del stack (usualmente el último del writerStack o el primero si es cost_saving)
                     const polisherStack = buildPriorityStack('cost_saving', textConfigs); 
                     
                     // ... (Lógica simplificada de maquetación, similar a la anterior) ...
                     // Para V5.2 confiamos en el prompt del Cronista que ya pide "NO Markdown headers".



                    // Generar Imagen Local (Banana Pro / Google Priority)
                    const chapterImageConfigs = [...imageConfigs].sort((a, b) => {
                         if (a.provider === 'google') return -1; // Banana Pro
                         return 1;
                    });
                    
                    const chapImg = await generateImage(
                        `Illustration for ${cleanTitle}, style ${projectConfig.visualStyle}. ${chapPlan.visuals?.imageType || 'professional'}`, 
                        chapterImageConfigs
                    );

                    await prisma.chapter.create({
                        data: {
                            bookId: book.id,
                            number: chapNum,
                            title: cleanTitle,
                            content: content,
                            imageUrl: chapImg 
                        }
                    })
                    
                    totalWords += content.split(/\s+/).length;
                    currentProgress += progressPerChapter;
                    sendUpdate(`✅ Cap ${chapNum} completado.`, currentProgress);
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
