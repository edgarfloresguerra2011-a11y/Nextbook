import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, context } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // 2. Build Priority List (DB High Priority -> Env Fallbacks)
    const userId = (session.user as any).id;
    const dbProviders = await prisma.providerConfig.findMany({
        where: { userId, isActive: true },
        orderBy: { priority: 'asc' }
    });

    let availableProviders = dbProviders.map(p => ({
        id: p.provider,
        apiKey: p.apiKey,
        model: p.modelName,
        source: 'database'
    }));

    // Add Env Fallbacks to the END of the list if they aren't already covered
    if (process.env.GOOGLE_API_KEY && !availableProviders.some(p => p.id === 'google')) {
        availableProviders.push({ id: 'google', apiKey: process.env.GOOGLE_API_KEY, model: 'gemini-3.0-pro', source: 'env' });
    }
    if (process.env.OPENROUTER_API_KEY && !availableProviders.some(p => p.id === 'openrouter')) {
        availableProviders.push({ id: 'openrouter', apiKey: process.env.OPENROUTER_API_KEY, model: 'google/gemini-3.0-pro', source: 'env' });
    }
    if (process.env.OPENAI_API_KEY && !availableProviders.some(p => p.id === 'openai')) {
        availableProviders.push({ id: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o', source: 'env' });
    }

    if (availableProviders.length === 0) {
        return NextResponse.json({ error: 'No active AI Provider configured.' }, { status: 400 });
    }

    // Detect if input likely a Title or Paragraph
    const isTitle = text.length < 60 && !text.includes('.');
    const instructions = isTitle 
        ? "DETECTADO: Título. REGLA: Reescribe solo el título. SIN Puntos finales. SIN comillas. Mismo estilo breve." 
        : "DETECTADO: Párrafo. REGLA: Reescribe el párrafo manteniendo la extensión original. NO agregues introducción ni conclusión.";

    const prompt = `
      Actúa como un editor literario experto. Tu tarea es reescribir estrictamente el texto proporcionado.
      
      INSTRUCCIONES CLAVE:
      ${instructions}
      
      Reglas Generales:
      1. MANTÉN EL SIGNIFICADO EXACTO.
      2. Si es una frase corta, devuélvela como frase corta.
      3. Si es un párrafo, devuélvelo como un solo párrafo.
      4. NUNCA agregues saludos, explicaciones o texto extra (e.g. "Aquí está tu texto").
      5. Salida: ÚNICAMENTE EL TEXTO REESCRITO.

      Texto original:
      "${text}"

      ${context ? `Contexto adicional: ${context}` : ''}
    `;

    // 3. Multi-Core Failover Loop
    let lastError = null;
    
    for (const provider of availableProviders) {
        try {
            console.log(`[MultiCore] Attempting rewrite with ${provider.id} (Model: ${provider.model || 'auto'})...`);
            
            let rewrittenText = '';

            // --- GOOGLE ---
            if (provider.id === 'google') {
                // Default if no model
                let modelId = provider.model || 'gemini-1.5-pro';
                // Clean cleanup
                modelId = modelId.replace(/^google\//, '');
                
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${provider.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                const data = await response.json();
                
                // If model invalid (404/400), THROW to trigger failover to next provider
                if (!response.ok) {
                    throw new Error(data.error?.message || `Gemini Error ${response.status}`);
                }
                
                rewrittenText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            }

            // --- OPENAI COMPATIBLE PROVIDERS (OpenRouter, Together, Mistral, Groq, DeepSeek, Perplexity, xAI) ---
            const openAICompatibles = ['openai', 'openrouter', 'together', 'mistral', 'groq', 'deepseek', 'perplexity', 'x-ai'];
            
            if (openAICompatibles.includes(provider.id)) {
                let baseUrl = 'https://api.openai.com/v1';
                
                switch(provider.id) {
                    case 'openrouter': baseUrl = 'https://openrouter.ai/api/v1'; break;
                    case 'together': baseUrl = 'https://api.together.xyz/v1'; break;
                    case 'mistral': baseUrl = 'https://api.mistral.ai/v1'; break;
                    case 'groq': baseUrl = 'https://api.groq.com/openai/v1'; break;
                    case 'deepseek': baseUrl = 'https://api.deepseek.com/v1'; break;
                    case 'perplexity': baseUrl = 'https://api.perplexity.ai'; break;
                    case 'x-ai': baseUrl = 'https://api.x.ai/v1'; break;
                }

                // Default models if none selected (Updated Dec 2025)
                let modelId = provider.model;
                if (!modelId) {
                    switch(provider.id) {
                        case 'openai': modelId = 'gpt-4o'; break;
                        case 'openrouter': modelId = 'google/gemini-2.0-flash-thinking-exp:free'; break; // Free & Powerful default
                        case 'together': modelId = 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo'; break;
                        case 'mistral': modelId = 'mistral-large-latest'; break;
                        case 'groq': modelId = 'llama-3.3-70b-versatile'; break;
                        case 'deepseek': modelId = 'deepseek-chat'; break;
                        case 'perplexity': modelId = 'llama-3.1-sonar-large-128k-online'; break;
                        case 'x-ai': modelId = 'grok-beta'; break;
                    }
                }

                console.log(`[MultiCore] calling ${provider.id} at ${baseUrl} with model ${modelId}`);

                const response = await fetch(`${baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${provider.apiKey}`,
                        ...(provider.id === 'openrouter' ? { 'HTTP-Referer': 'https://nexbook.ai', 'X-Title': 'Nexbook AI' } : {})
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7,
                        max_tokens: 4000
                    })
                });
                
                // Detailed Error Logging
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`[MultiCore] ${provider.id} Error (${response.status}):`, errorText);
                    throw new Error(`API Error (${provider.id} ${response.status}): ${errorText.substring(0, 200)}`);
                }
                
                const data = await response.json();
                rewrittenText = data.choices?.[0]?.message?.content;
            }

            // --- ANTHROPIC ---
            else if (provider.id === 'anthropic') {
                let modelId = provider.model || 'claude-3-sonnet-20240229';
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': provider.apiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: modelId,
                        max_tokens: 1024,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error?.message || "Anthropic API Error");
                rewrittenText = data.content?.[0]?.text;
            }

            // Success Check
            if (rewrittenText) {
                return NextResponse.json({ rewritten: rewrittenText });
            } else {
                throw new Error("Empty response from provider");
            }

        } catch (error: any) {
            console.error(`[MultiCore] Provider ${provider.id} failed:`, error.message);
            lastError = error;
            // Continue to next provider in the loop...
        }
    }

    // If we get here, ALL providers failed
    return NextResponse.json({ 
        error: `All AI providers failed. Last error: ${lastError?.message || 'Unknown'}` 
    }, { status: 500 });

  } catch (error: any) {
    console.error('Rewrite fatal error:', error);
    return NextResponse.json({ error: error.message || 'Fatal error' }, { status: 500 });
  }
}
