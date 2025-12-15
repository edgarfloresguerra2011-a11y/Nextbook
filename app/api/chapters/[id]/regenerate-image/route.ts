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

  // 3. Obtener todas las configs activas
  const providers = await prisma.providerConfig.findMany({
    where: { userId, isActive: true }
  })
  
  const replicateConfig = providers.find((p: any) => p.provider === 'replicate')
  const openaiConfig = providers.find((p: any) => p.provider === 'openai')
  const huggingfaceConfig = providers.find((p: any) => p.provider === 'huggingface')

  // Mejorar el prompt para realismo
  const prompt = `Hyper-realistic minimalist photography for book chapter "${chapter.title}". Context: ${chapter.book.title}. Style: ${chapter.book.genre}, award winning photography, 8k, highly detailed, dramatic lighting, cinematic composition, rule of thirds, no text, no words`
  
  let newImageUrl = ''
  let usedProvider = ''

  // PRIORIDAD 1: REPLICATE (NanoBanana / FLUX) - Calidad "Flux Difusion"
  if (replicateConfig?.apiKey) {
      try {
          console.log('[Regen] Intentando generar con Replicate (FLUX)...')
          const output = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
              "Authorization": `Token ${replicateConfig.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              // Flux Schnell (Rápido y bueno)
              version: "black-forest-labs/flux-schnell", 
              input: { prompt: prompt, aspect_ratio: "1:1", output_quality: 90 }
            }),
          });
          
          if (output.ok) {
             const json = await output.json();
             // Replicate devuelve un prediction ID, hay que esperar el resultado (polling) o usar el output directo si es modelo rápido
             // Para simplificar sin polling complejo en edge function, intentaremos usar si devuelve url directa o esperar un poco
             // NOTA: Flux Schnell en Replicate suele ser muy rápido, pero la API es asíncrona.
             // Si esto es complejo de implementar aquí, usaremos polling simple.
             
             // ...Implementación simplificada de polling...
             let prediction = json;
             let attempts = 0;
             while (prediction.status !== "succeeded" && prediction.status !== "failed" && attempts < 10) {
                await new Promise(r => setTimeout(r, 1000));
                const statusRes = await fetch(prediction.urls.get, {
                    headers: { "Authorization": `Token ${replicateConfig.apiKey}` }
                });
                prediction = await statusRes.json();
                attempts++;
             }
             
             if (prediction.status === "succeeded" && prediction.output) {
                 newImageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
                 usedProvider = 'replicate';
                 console.log('[Regen] Éxito con Replicate/Flux');
             }
          }
      } catch (e) {
          console.error('[Regen] Error Replicate:', e)
      }
  }

  // PRIORIDAD 2: OPENAI (DALL-E 3)
  if (!newImageUrl && openaiConfig?.apiKey) {
      try {
          console.log('[Regen] Intentando generar con DALL-E 3...')
          const response = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${openaiConfig.apiKey}`
              },
              body: JSON.stringify({
                  model: "dall-e-3",
                  prompt: prompt.substring(0, 1000),
                  n: 1,
                  size: "1024x1024",
                  quality: "standard", // standard es más rápido y barato, hd es premium
                  response_format: "url"
              })
          })

          if (response.ok) {
              const data = await response.json()
              if (data.data?.[0]?.url) {
                  newImageUrl = data.data[0].url
                  usedProvider = 'openai';
              }
          }
      } catch (e) {
          console.error('[Regen] Error DALL-E 3:', e)
      }
  }

  // PRIORIDAD 3: HUGGING FACE (SDXL)
  if (!newImageUrl && huggingfaceConfig?.apiKey) {
      try {
           console.log('[Regen] Intentando generar con HuggingFace (SDXL)...')
           const response = await fetch(
            "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
            {
                headers: { Authorization: `Bearer ${huggingfaceConfig.apiKey}` },
                method: "POST",
                body: JSON.stringify({ inputs: prompt }),
            }
        );
        if (response.ok) {
            const blob = await response.blob();
            // Necesitamos subir este blob o convertirlo a base64 para mostrarlo, 
            // pero para DB necesitamos URL. Como no tenemos storage aquí fácil, 
            // usaremos Pollinations como fallback de display si falla storage, 
            // PERO el usuario pidió no usar Pollinations.
            // Dado que no tenemos S3 configurado en este snippet, HF es difícil de persistir sin storage.
            // Saltaremos HF por ahora si no hay storage service.
            console.log('[Regen] HuggingFace generó blob, pero falta storage. Saltando.');
        }
      } catch (e) { console.error('Error HF', e)}
  }

  // FALLBACK FINAL: Pollinations (SOLO SI NO HAY NADA MÁS Y EL USUARIO NO TIENE KEYS)
  // El usuario dijo "no de pollinations".
  // Pero si no generamos nada, la app se rompe.
  // Usaremos un modelo MEJOR de Pollinations especificando 'flux' explícitamente y 'enhance=true'
  if (!newImageUrl) {
       return NextResponse.json({ 
           error: 'No se pudo generar la imagen. Asegúrate de tener una API Key válida de Replicate o OpenAI configurada en Ajustes.' 
       }, { status: 400 })
  }

  if (newImageUrl) {
      // 6. Actualizar Capítulo
      await prisma.chapter.update({
          where: { id: chapterId },
          data: { imageUrl: newImageUrl }
      })
      
      // Descontar crédito
      await prisma.user.update({ where: { id: userId }, data: { credits: { decrement: 1 } } })
  }

  return NextResponse.json({ success: true, imageUrl: newImageUrl })
}
