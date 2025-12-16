import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const maxDuration = 60; 

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`[RegenChapter] 🚀 Request for chapter: ${params.id}`);

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const chapterId = params.id
  const userId = (session.user as any).id

  const [chapter, user] = await Promise.all([
      prisma.chapter.findUnique({ where: { id: chapterId }, include: { book: true } }),
      prisma.user.findUnique({ where: { id: userId } })
  ]);

  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
  if (!user || user.credits < 1) return NextResponse.json({ error: 'Créditos insuficientes' }, { status: 403 });

  const body = await req.json().catch(() => ({})); 
  const requestedStyle = body.style || 'cinematic';
  
  let styleDesc = "photorealistic, cinematic lighting, 8k quality, dramatic composition";
  if (requestedStyle === 'comic') styleDesc = "comic book art, vivid colors, bold lines";
  if (requestedStyle === 'anime') styleDesc = "anime style, Studio Ghibli inspired, detailed background";
  if (requestedStyle === 'embroidery') styleDesc = "embroidery style, needlework texture, fabric pattern";
  
  const contentSnippet = chapter.content?.substring(0, 300) || '';
  const prompt = `Create an illustration for a book chapter titled "${chapter.title}". 
Book: "${chapter.book.title}" (${chapter.book.genre}).
Scene context: ${contentSnippet}
Art style: ${styleDesc}.
Important: Generate ONLY visual artwork. No text, letters, or words in the image.`;

  let imageBuffer: Buffer | null = null;
  let successProvider = '';
  const errors: string[] = [];
  let mimeType = 'image/png';

  // =================================================================================
  // PRIORITY 1: GOOGLE GEMINI
  // =================================================================================
  const googleApiKey = process.env.GOOGLE_API_KEY;
  if (googleApiKey) {
      const geminiModels = ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];
      for (const model of geminiModels) {
          if (imageBuffer) break;
          try {
              const response = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                  {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': googleApiKey },
                      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                  }
              );

              if (response.ok) {
                  const data = await response.json();
                  const parts = data.candidates?.[0]?.content?.parts || [];
                  for (const part of parts) {
                      if (part.inlineData?.data) {
                          imageBuffer = Buffer.from(part.inlineData.data, 'base64');
                          successProvider = `Google Gemini (${model})`;
                          if (part.inlineData.mimeType) mimeType = part.inlineData.mimeType;
                          break;
                      }
                  }
              } else {
                  errors.push(`gemini-${model}: ${response.status}`);
              }
          } catch (e: any) {
              errors.push(`gemini-${model}: ${e.message}`);
          }
      }
  }

  // =================================================================================
  // PRIORITY 2: COMET API (DALL-E 3)
  // =================================================================================
  const cometKey = process.env.COMET_API_KEY;
  if (cometKey && !imageBuffer) {
      try {
           const response = await fetch('https://api.cometapi.com/v1/images/generations', {
               method: 'POST',
               headers: { 'Authorization': `Bearer ${cometKey}`, 'Content-Type': 'application/json' },
               body: JSON.stringify({
                   model: "dall-e-3",
                   prompt: prompt.substring(0, 1000),
                   n: 1,
                   size: "1024x1024",
                   response_format: "b64_json"
               })
           });

           if (response.ok) {
               const data = await response.json();
               const b64 = data.data?.[0]?.b64_json;
               if (b64) {
                   imageBuffer = Buffer.from(b64, 'base64');
                   successProvider = 'CometAPI (DALL-E 3)';
                   mimeType = 'image/png';
               }
           } else {
               errors.push(`comet: ${response.status}`);
           }
      } catch(e: any) {
           errors.push(`comet: ${e.message}`);
      }
  }

  // =================================================================================
  // PRIORITY 3: CLOUDFLARE WORKERS AI
  // =================================================================================
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  
  if (cfToken && cfAccountId && !imageBuffer) {
      try {
          const response = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
              {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfToken}` },
                  body: JSON.stringify({ prompt: prompt.substring(0, 500), num_steps: 4 })
              }
          );

          if (response.ok) {
              const data = await response.json();
              const b64 = data.result?.image; 
              if (b64) {
                  imageBuffer = Buffer.from(b64, 'base64');
                  successProvider = 'Cloudflare Workers AI';
                  mimeType = 'image/png';
              }
           } else {
              errors.push(`cloudflare: ${response.status}`);
           }
      } catch (e: any) {
          errors.push(`cloudflare: ${e.message}`);
      }
  }

  // =================================================================================
  // SAVE & RESPOND
  // =================================================================================
  if (imageBuffer) {
      try {
          const base64 = imageBuffer.toString('base64');
          const dataUrl = `data:${mimeType};base64,${base64}`;
          
          await prisma.chapter.update({ where: { id: chapterId }, data: { imageUrl: dataUrl } });
          await prisma.user.update({ where: { id: userId }, data: { credits: { decrement: 1 } } });
          
          return NextResponse.json({ success: true, imageUrl: dataUrl, provider: successProvider });
      } catch (e: any) {
           return NextResponse.json({ error: 'Save failed' }, { status: 500 });
      }
  }

  return NextResponse.json({ error: 'No se pudo generar imagen.', details: errors }, { status: 200 });
}
