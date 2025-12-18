import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const maxDuration = 60; // Allow 60s timeout

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`[RegenCover] 🟢 Request for Book ID: ${params.id}`);
  
  const session = await getServerSession(authOptions);
  
  // Cast session to any to avoid TS errors with custom user properties during rapid dev
  const s = session as any;

  if (!s?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
  }

  const bookId = params.id;
  const userId = s.user.id;

  const [book, user] = await Promise.all([
      prisma.book.findUnique({ where: { id: bookId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { credits: true, authorName: true, coverStyle: true, email: true } })
  ]);

  if (!book) return NextResponse.json({ error: 'Book not found', success: false }, { status: 404 });

  // FETCH API KEYS FROM DB
  const providers = await prisma.providerConfig.findMany({
      where: { userId, isActive: true }
  });
  
  const deepseekKey = providers.find((p: any) => p.provider === 'deepseek')?.apiKey || process.env.DEEPSEEK_API_KEY;
  const replicateKey = providers.find((p: any) => p.provider === 'replicate')?.apiKey || process.env.REPLICATE_API_TOKEN;
  const openAiKey = providers.find((p: any) => p.provider === 'openai')?.apiKey || process.env.OPENAI_API_KEY;

  // REGENERATION LIMIT CHECK
  if ((book.coverRegenCount || 0) >= 3) {
      return NextResponse.json({ 
          error: 'Has alcanzado el límite de 3 regeneraciones para la portada.',
          limitReached: true
      }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  console.log('[RegenCover] Body:', body);
  console.log('[RegenCover] User Data:', user);
  const style = body.style || user?.coverStyle || 'modern_light';

  const bgStyles: Record<string, string> = {
      'modern_light': 'clean, bright modern studio background, soft lighting',
      'studio_white': 'on a seamless white background, high key photography',
      'minimal_grey': 'on a minimal soft grey surface, elegant',
      'wooden_table': 'on a light oak wooden table, cozy atmosphere',
      'soft_gradient': 'with a soft pastel color gradient background',
      'geometric_abstract': 'with a subtle light geometric abstract background',
      'natural_light': 'bathed in soft natural window light, lifestyle photography',
      'clean_tech': 'on a clean white surface with subtle blue tech accents',
      'coffee_shop_blur': 'on a table in a blurred modern coffee shop background',
      'marble_surface': 'on a luxurious white marble surface'
  };

  const bgPrompt = bgStyles[style] || bgStyles['modern_light'];
  const authorContext = user?.authorName ? `by author "${user.authorName}"` : '';

  const prompt = `A straight-on, front-facing view of a premium book cover. 
  The Title MUST be clearly written as: "${book.title}".
  ${authorContext ? `The Author Name MUST be written as: "${user.authorName}".` : ''}
  Typography should be: Large, Bold, Cinematic, and Legible.
  Visual Theme: ${book.description?.substring(0, 100) || book.genre}. 
  Background/Style: ${bgPrompt}, ${book.genre} aesthetics. 
  Render quality: 8k resolution, photorealistic texture, professional graphic design, masterpiece.`;

  let imageBuffer: Buffer | null = null;
  let successProvider = '';
  const errors: string[] = [];
  let mimeType = 'image/png';

  // =================================================================================
  // UNIFIED PROVIDER LOGIC (DEEPSEEK PRIORITY -> REPLICATE -> OPENAI)
  // =================================================================================
  
  // 1. DEEPSEEK (Priority)
  if (!imageBuffer && deepseekKey) {
      try {
          console.log('🎨 [RegenCover] Attempting DeepSeek Image...');
          const response = await fetch('https://api.deepseek.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${deepseekKey}`
                },
                body: JSON.stringify({
                    prompt: prompt + ", professional, high quality, no text",
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
                   successProvider = 'DeepSeek Image';
               }
           } else {
               console.warn(`[RegenCover] DeepSeek Failed: ${response.status}`);
           }
      } catch (e: any) { console.error('DeepSeek Error:', e.message); }
  }

  // 2. REPLICATE (Flux/Hunyuan)
  if (!imageBuffer && replicateKey) {
      try {
          console.log('🎨 [RegenCover] Attempting Replicate...');
          const modelId = "black-forest-labs/flux-schnell";
          const output = await fetch(`https://api.replicate.com/v1/models/${modelId}/predictions`, {
            method: "POST",
            headers: {
              "Authorization": `Token ${replicateKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: { prompt: prompt, disable_safety_checker: true }
            }),
          });
          
          if (output.ok) {
             const json = await output.json();
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
                 const imgRes = await fetch(url);
                 const arrayBuf = await imgRes.arrayBuffer();
                 imageBuffer = Buffer.from(arrayBuf);
                 successProvider = 'Replicate (Flux)';
                 mimeType = 'image/webp';
             }
          }
      } catch(e: any) { console.error('Replicate Error:', e.message); errors.push(`replicate: ${e.message}`); }
  }

  // 3. OPENAI (DALL-E 3)
  if (!imageBuffer && openAiKey) {
      try {
          console.log('🎨 [RegenCover] Attempting DALL-E 3...');
          const res = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  model: "dall-e-3",
                  prompt: prompt,
                  n: 1,
                  size: "1024x1024",
                  response_format: "b64_json", 
                  quality: "standard"
              })
          });
          if (res.ok) {
              const x = await res.json();
              const b64 = x.data?.[0]?.b64_json;
              if (b64) {
                  imageBuffer = Buffer.from(b64, 'base64');
                  successProvider = 'OpenAI (DALL-E 3)';
                  mimeType = 'image/png';
              }
          } else {
              errors.push(`openai: ${res.status}`);
          }
      } catch (e: any) { errors.push(`openai: ${e.message}`); }
  }

  // 4. FAL/COMET Fallback (Optional, keeps existing logic if desired, but replacing previous blocks fully)


  // =================================================================================
  // SAVE & RESPOND (Using Base64 directly for reliability)
  // =================================================================================
  if (imageBuffer) {
      try {
          // Convert buffer to Base64 Data URL
          const base64 = imageBuffer.toString('base64');
          const dataUrl = `data:${mimeType};base64,${base64}`;
          
          console.log(`[RegenCover] 💾 Saving ${mimeType} (${dataUrl.length} chars) from ${successProvider}`);

          await prisma.book.update({ 
              where: { id: bookId }, 
              data: { coverImageUrl: dataUrl, coverRegenCount: { increment: 1 } } 
          });
          
          // Deduct credits
          if (user && user.credits > 0) {
             await prisma.user.update({ where: { id: userId }, data: { credits: { decrement: 1 } } });
          }
          
          return NextResponse.json({ success: true, imageUrl: dataUrl, provider: successProvider });

      } catch (saveError: any) {
          console.error('[RegenCover] Save Error:', saveError);
          return NextResponse.json({ 
              error: 'Failed to update DB', 
              details: [saveError.message] 
          }, { status: 500 });
      }
  }

  console.error('[RegenCover] ❌ ALL FAILED:', errors);
  return NextResponse.json({ 
      success: false, 
      error: 'No se pudo generar imagen con ningún proveedor.', 
      details: errors 
  }, { status: 200 }); // Return 200 so frontend handles the error message gracefully
}
