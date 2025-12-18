
import { PrismaClient } from "@prisma/client";

// Types
export interface AIConfig {
    provider: string;
    apiKey: string;
    model?: string;
}

// 1. TEXT GENERATION CORE
export async function generateTextCore(
  prompt: string, 
  systemPrompt: string, 
  config: AIConfig
): Promise<string> {
  const { provider, apiKey, model } = config
  
  // Model Mapping Logic
  let targetModel = model
  if (!targetModel) {
    if (provider === 'google') targetModel = 'gemini-2.0-flash-exp'
    else if (provider === 'openrouter') targetModel = 'google/gemini-2.0-flash-exp:free'
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

  // OpenRouter / OpenAI Standard
  let baseUrl = 'https://api.openai.com/v1'
  let headers: Record<string, string> = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  
  if (provider === 'openrouter') {
    baseUrl = 'https://openrouter.ai/api/v1'
    headers['HTTP-Referer'] = 'https://nexbook.app'
    headers['X-Title'] = 'Nexbook AI'
    
    // Backup models logic
    const backupModels = [
        'meta-llama/llama-3.1-8b-instruct:free',
        'mistralai/mistral-7b-instruct:free',
        'microsoft/phi-3-mini-128k-instruct:free'
    ]
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
        const data = await tryFetch(targetModel!)
        return data.choices?.[0]?.message?.content || ''
    } catch (e: any) {
        console.warn(`Primary model ${targetModel} failed:`, e.message)
        for (const backup of backupModels) {
            try {
                console.log(`🔄 Switching to backup model: ${backup}`)
                const data = await tryFetch(backup)
                return data.choices?.[0]?.message?.content || ''
            } catch (retryErr) { continue }
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

// 2. ROBUST GENERATION WITH FALLBACK
export async function generateWithFallback(
  prompt: string, 
  systemPrompt: string, 
  configs: AIConfig[],
  modelHierarchy?: string[] // Optional priority list of models to try if configs have them
): Promise<string> {
    
  // If modelHierarchy is provided, we try to sort or find configs that match these models first
  // This is complex because configs usually map to providers, not just models.
  // But we can filter configs.
  
  let sortedConfigs = [...configs];

  if (modelHierarchy && modelHierarchy.length > 0) {
      // Logic to prioritize specific models if available in the configs
      // For now, we trust the `configs` order passed in, but the caller should sort them.
  }

  const errors: string[] = []
  for (const config of sortedConfigs) {
    try {
      // console.log(`Trying provider: ${config.provider} (Model: ${config.model || 'default'})...`)
      const result = await generateTextCore(prompt, systemPrompt, config)
      if (result && result.length > 0) return result 
    } catch (e: any) {
      console.warn(`⚠️ Provider ${config.provider} failed: ${e.message}`)
      errors.push(`${config.provider}: ${e.message}`)
    }
  }
  throw new Error(`All AI providers failed. Details: ${errors.join(' | ')}`)
}
