import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const maxDuration = 60; 

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log(`[RegenChapter] 🚀 Request for chapter: ${params.id}`);

  const session = await getServerSession(authOptions);
  // Cast session to any to act as quick fix for custom user properties
  const s = session as any;

  if (!s?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const chapterId = params.id
  const userId = s.user.id

  // We need to fetch chapter with book relation
  const chapterData = await prisma.chapter.findUnique({ 
      where: { id: chapterId }, 
      include: { book: true } 
  });
  
  // Cast to any to access potentially new fields or just rely on proper generation
  const chapter = chapterData as any;

  const userData = await prisma.user.findUnique({ where: { id: userId } });
  const user = userData as any;

  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
  if (!user || user.credits < 1) return NextResponse.json({ error: 'Créditos insuficientes' }, { status: 403 });

  // FETCH API KEYS FROM DB
  const providers = await prisma.providerConfig.findMany({
      where: { userId, isActive: true }
  });
  
  const deepseekKey = providers.find((p: any) => p.provider === 'deepseek')?.apiKey || process.env.DEEPSEEK_API_KEY;
  const replicateKey = providers.find((p: any) => p.provider === 'replicate')?.apiKey || process.env.REPLICATE_API_TOKEN;
  const openAiKey = providers.find((p: any) => p.provider === 'openai')?.apiKey || process.env.OPENAI_API_KEY;

  // =================================================================================
  // ORACLE LOGIC: DECIDE STRATEGY & LIMITS (Early Binding)
  // =================================================================================
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

  const textKeywords = ['text', 'recipe', 'menu', 'sign', 'title', 'letters', 'words', 'typography', 'label'];
  const needsText = textKeywords.some(w => prompt.toLowerCase().includes(w)) || requestedStyle === 'comic';
  
  // RULE: Premium (Text/Complex) -> 2 Regens | Standard (Illustrative) -> 3 Regens
  const maxRegens = needsText ? 2 : 3;

  console.log(`[RegenImage] Oracle Analysis: Needs Text? ${needsText} -> Limit: ${maxRegens}`);

  // REGENERATION LIMIT CHECK
  const currentRegenCount = chapter.imageRegenCount || 0;
  if (currentRegenCount >= maxRegens) {
      return NextResponse.json({ 
          error: `Has alcanzado el límite de ${maxRegens} regeneraciones para esta imagen ${needsText ? '(Premium)' : '(Estándar)'}.`,
          limitReached: true
      }, { status: 403 });
  }

  let imageBuffer: Buffer | null = null;
  let successProvider = '';
  const errors: string[] = [];
  let mimeType = 'image/png';



  // =================================================================================
  // UNIFIED PROVIDER LOGIC (Smart Rerouting)
  // =================================================================================
  
  // REROUTE LOGIC: If this is a regeneration (User unhappy), prioritize DALL-E 3 (OpenAI).
  const prioritizeDallE = chapter.imageRegenCount > 0 || requestedStyle === 'rustic_food_photography';
  console.log(`[RegenImage] Strategy: ${prioritizeDallE ? 'Using DALL-E 3 (Reroute Mode)' : 'Using DeepSeek (Speed Mode)'}`);

  // 0. OPENAI (DALL-E 3) - PRIORITY SLOT
  if (prioritizeDallE && !imageBuffer && openAiKey) {
      try {
          console.log('🎨 [RegenImage] Attempting DALL-E 3 (Priority)...');
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
              if (res.status !== 400) errors.push(`openai: ${res.status}`); // Don't log content policy errors as system errors
              console.warn(`[RegenImage] DALL-E Priority Failed: ${res.status}`);
          }
      } catch (e: any) { console.error('OpenAI Error:', e.message); }
  } else if (prioritizeDallE && !openAiKey) {
     console.warn("[RegenImage] DALL-E requested but no key found. Falling back.");
  }

  // 1. DEEPSEEK (Standard Priority)
  if (!imageBuffer && deepseekKey) {
      try {
          console.log('🎨 [RegenImage] Attempting DeepSeek Image...');
          // Hypothetical endpoint - if 404, it catches and moves on.
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
               console.warn(`[RegenImage] DeepSeek Failed: ${response.status}`);
           }
      } catch (e: any) { console.error('DeepSeek Error:', e.message); }
  }

  // 2. REPLICATE (Flux/Hunyuan)
  if (!imageBuffer && replicateKey) {
      try {
          console.log('🎨 [RegenImage] Attempting Replicate...');
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
          console.log('🎨 [RegenImage] Attempting DALL-E 3...');
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

  // =================================================================================
  // SAVE & RESPOND
  // =================================================================================
  if (imageBuffer) {
      try {
          // Cast to any to avoid "never" type inference
          const buf = imageBuffer as any; 
          const base64 = buf.toString('base64');
          const dataUrl = `data:${mimeType};base64,${base64}`;
          
           await prisma.chapter.update({ 
              where: { id: chapterId }, 
              data: { imageUrl: dataUrl, imageRegenCount: { increment: 1 } } as any
           });
           await prisma.user.update({ where: { id: userId }, data: { credits: { decrement: 1 } } });
           
           return NextResponse.json({ success: true, imageUrl: dataUrl, provider: successProvider, limitReached: false });
      } catch (e: any) {
           console.error("Save Error:", e);
           return NextResponse.json({ error: 'Save failed' }, { status: 500 });
      }
  }

  return NextResponse.json({ error: 'No se pudo generar imagen.', details: errors }, { status: 200 });
}
