
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

// Reuse image generation logic from autopilot
// Reuse image generation logic
async function generateImage(prompt: string, providers: any[]): Promise<string> {
  const enhancedPrompt = prompt + ", professional photography, high quality, sharp focus, vibrant colors, 8k, photorealistic"
  
  for (const config of providers) {
    if (!config.apiKey) continue
    try {
      console.log(`[Mockup] Trying ${config.provider}...`)
      
      // OpenAI DALL-E
      if (config.provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: enhancedPrompt.substring(0, 1000),
            n: 1, size: "1024x1024", quality: "standard", response_format: "url"
          })
        })
        if (response.ok) {
          const data = await response.json()
          if (data.data?.[0]?.url) return data.data[0].url
        }
      }
      
      // Together AI
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
      
      // Replicate
      if (config.provider === 'replicate') {
         const response = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${config.apiKey}` },
           body: JSON.stringify({ input: { prompt: enhancedPrompt } })
         })
         
         if (response.ok) {
            let prediction = await response.json()
            // Polling
            let attempts = 0
            while (prediction.status !== "succeeded" && prediction.status !== "failed" && attempts < 10) {
               await new Promise(r => setTimeout(r, 1500))
               const statusRes = await fetch(prediction.urls.get, {
                   headers: { "Authorization": `Token ${config.apiKey}` }
               })
               prediction = await statusRes.json()
               attempts++
            }
            if (prediction.status === "succeeded" && prediction.output) {
                return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
            }
         }
      }

    } catch (e) { console.error(`[Mockup] ${config.provider} failed`, e) }
  }
  
  throw new Error("No se pudo generar el mockup con ninguna de las APIs configuradas.")
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id
    const { scene } = await req.json()

    const book = await prisma.book.findUnique({
      where: { id: params.id, userId },
      select: { title: true, description: true }
    })
    
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

    const providers = await prisma.providerConfig.findMany({ where: { userId, isActive: true } })
    const imageConfigs = providers.filter((p: any) => 
        ['openai', 'together', 'stability', 'replicate', 'huggingface'].includes(p.provider)
    )

    // Generate Mockup Prompt
    const mockupPrompt = `Professional product photography of a book titled "${book.title}". Context: ${scene}. High end advertising style.`
    
    const imageUrl = await generateImage(mockupPrompt, imageConfigs)

    return NextResponse.json({ url: imageUrl })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
