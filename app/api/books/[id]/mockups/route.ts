
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

// Reuse image generation logic from autopilot
async function generateImage(prompt: string, apiKey?: string): Promise<string> {
  if (apiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt.substring(0, 1000),
            n: 1,
            size: "1024x1024",
            quality: "standard",
            response_format: "url"
          })
        })
        if (response.ok) {
            const data = await response.json()
            return data.data[0]?.url
        }
      } catch (e) { console.error('DALL-E failed', e) }
  }
  const encodedPrompt = encodeURIComponent(prompt + ", photorealistic, high quality product photography, 8k")
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&width=1024&height=1024&seed=${Math.floor(Math.random() * 1000)}`
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
    const imageConfig = providers.find((p: any) => p.provider === 'openai')

    // Generate Mockup Prompt
    const mockupPrompt = `Professional product photography of a book titled "${book.title}". Context: ${scene}. High end advertising style.`
    
    const imageUrl = await generateImage(mockupPrompt, imageConfig?.apiKey)

    return NextResponse.json({ url: imageUrl })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
