import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const maxDuration = 60; // Allow 60s timeout

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`[RegenCover] 🟢 Request for Book ID: ${params.id}`);
  
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
  }

  const bookId = params.id;
  const userId = (session.user as any).id;

  const [book, user] = await Promise.all([
      prisma.book.findUnique({ where: { id: bookId } }),
      prisma.user.findUnique({ where: { id: userId } })
  ]);

  if (!book) return NextResponse.json({ error: 'Book not found', success: false }, { status: 404 });

  const prompt = `Create a stunning, professional book cover illustration for "${book.title}". 
Genre: ${book.genre}. 
Theme: ${book.description?.substring(0, 100) || 'Captivating story'}. 
Style: Cinematic, award-winning design, 8k quality, dramatic lighting, visually striking artwork. 
Important: Generate ONLY the visual artwork. No text, no letters, no words in the image.`;

  let imageBuffer: Buffer | null = null;
  let successProvider = '';
  const errors: string[] = [];
  let mimeType = 'image/png';

  // =================================================================================
  // PRIORITY 1: GOOGLE GEMINI (Highest Quality Available)
  // =================================================================================
  const googleApiKey = process.env.GOOGLE_API_KEY;
  if (googleApiKey) {
      // Try models in order of quality/recency
      const geminiModels = ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];
      
      for (const model of geminiModels) {
          if (imageBuffer) break;
          console.log(`[RegenCover] 🍌 Trying Gemini Model: ${model}...`);
          
          try {
              const response = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                  {
                      method: 'POST',
                      headers: { 
                          'Content-Type': 'application/json',
                          'x-goog-api-key': googleApiKey
                      },
                      body: JSON.stringify({
                          contents: [{ parts: [{ text: prompt }] }]
                      })
                  }
              );

              if (response.ok) {
                  const data = await response.json();
                  // Gemini returns base64 inside candidates[0].content.parts[0].inlineData.data
                  const parts = data.candidates?.[0]?.content?.parts || [];
                  for (const part of parts) {
                      if (part.inlineData?.data) {
                          imageBuffer = Buffer.from(part.inlineData.data, 'base64');
                          successProvider = `Google Gemini (${model})`;
                          if (part.inlineData.mimeType) mimeType = part.inlineData.mimeType;
                          else mimeType = 'image/jpeg'; // Usually JPEG
                          break;
                      }
                  }
              } else {
                  // Log but continue to next model/provider
                  const errText = await response.text();
                  console.log(`[RegenCover] Gemini ${model} error: ${response.status} - ${errText.substring(0,100)}`);
                  errors.push(`gemini-${model}: ${response.status}`);
              }
          } catch (e: any) {
              console.error(`[RegenCover] Gemini ${model} exception:`, e.message);
              errors.push(`gemini-${model}: ${e.message}`);
          }
      }
  }

  // =================================================================================
  // PRIORITY 2: COMET API (DALL-E 3) - Premium Quality
  // =================================================================================
  const cometKey = process.env.COMET_API_KEY;
  if (cometKey && !imageBuffer) {
      console.log('[RegenCover] ☄️ Trying CometAPI (DALL-E 3)...');
      try {
           const response = await fetch('https://api.cometapi.com/v1/images/generations', {
               method: 'POST',
               headers: {
                   'Authorization': `Bearer ${cometKey}`,
                   'Content-Type': 'application/json'
               },
               body: JSON.stringify({
                   model: "dall-e-3",
                   prompt: prompt.substring(0, 1000), // DALL-E limit
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
               const err = await response.text();
               console.log(`[RegenCover] CometAPI error: ${err.substring(0,100)}`);
               errors.push(`comet: ${response.status}`);
           }
      } catch(e: any) {
           errors.push(`comet: ${e.message}`);
      }
  }

  // =================================================================================
  // PRIORITY 3: CLOUDFLARE WORKERS AI (Fallback)
  // =================================================================================
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  
  if (cfToken && cfAccountId && !imageBuffer) {
      console.log('[RegenCover] ☁️ Trying Cloudflare Workers AI (Fallback)...');
      try {
          const modelId = '@cf/black-forest-labs/flux-1-schnell';
          const response = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${modelId}`,
              {
                  method: 'POST',
                  headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${cfToken}`
                  },
                  body: JSON.stringify({
                      prompt: prompt.substring(0, 500),
                      num_steps: 8 // Higher steps for better quality if possible
                  })
              }
          );

          if (response.ok) {
              const data = await response.json();
              const b64 = data.result?.image; // FIXED: Extract from JSON
              if (b64) {
                  imageBuffer = Buffer.from(b64, 'base64');
                  successProvider = 'Cloudflare Workers AI (FLUX)';
                  mimeType = 'image/png';
              } else {
                  errors.push('cloudflare: no image in result');
              }
          } else {
              const errText = await response.text();
              errors.push(`cloudflare: ${response.status}`);
          }
      } catch (e: any) {
          errors.push(`cloudflare: ${e.message}`);
      }
  }

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
              data: { coverImageUrl: dataUrl } 
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
