// Datos completos de proveedores de IA con links, modelos y tags

export interface AIModel {
  id: string;
  name: string;
  contextWindow?: number;
  pricing?: string;
  tags: string[];
}

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  apiKeyUrl: string; // Link directo a la página de API keys
  docsUrl: string;
  categories: string[]; // text_generation, image_generation, etc.
  tags: string[]; // free, premium, fast, economical, etc.
  models?: AIModel[]; // Lista de modelos disponibles
  logo?: string;
}

export const AI_PROVIDERS: AIProvider[] = [
  // ========== AGREGADORES (OpenRouter, Together AI, etc.) ==========
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Acceso unificado a 150+ modelos de IA de múltiples proveedores con un solo API key',
    apiKeyUrl: 'https://openrouter.ai/keys',
    docsUrl: 'https://openrouter.ai/docs',
    // CLONED TO ALL CATEGORIES
    categories: ['text_generation', 'image_generation', 'grammar', 'humanization'],
    tags: ['agregador', 'múltiples-modelos', 'económico', 'flexible'],
    models: [
      // --- NEW DEC 2025 SOTA MODELS ---
      { id: 'google/gemini-3.0-pro', name: 'Gemini 3.0 Pro', contextWindow: 2000000, pricing: '$1.50/$6 por 1M tokens', tags: ['premium', 'google', 'dec-2025', 'sota'] },
      { id: 'openai/gpt-5.2', name: 'GPT-5.2 (OpenRouter)', contextWindow: 128000, pricing: '$5/$20 por 1M tokens', tags: ['premium', 'openai', 'dec-2025'] },
      { id: 'anthropic/claude-4.5-opus', name: 'Claude 4.5 Opus (OpenRouter)', contextWindow: 200000, pricing: '$25/$100 por 1M tokens', tags: ['premium', 'anthropic', 'top-tier'] },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', contextWindow: 131072, pricing: '$0.50/$0.50 por 1M tokens', tags: ['meta', 'sota', 'open-source'] },
      
      // Modelos Gratis
      { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B Instruct (Free)', contextWindow: 131072, pricing: 'FREE', tags: ['gratis', 'rápido', 'ligero'] },
      { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B Instruct (Free)', contextWindow: 131072, pricing: 'FREE', tags: ['gratis', 'rápido'] },
      { id: 'google/gemini-flash-1.5-8b-exp:free', name: 'Gemini Flash 1.5 8B Exp (Free)', contextWindow: 1000000, pricing: 'FREE', tags: ['gratis', 'google', '1M-context'] },
      { id: 'google/gemini-2.0-flash-thinking-exp:free', name: 'Gemini 2.0 Flash Thinking (Free)', contextWindow: 32768, pricing: 'FREE', tags: ['gratis', 'reasoning', 'google'] },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (Free)', contextWindow: 32768, pricing: 'FREE', tags: ['gratis', 'rápido'] },
      { id: 'microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini 128K (Free)', contextWindow: 128000, pricing: 'FREE', tags: ['gratis', 'microsoft', '128k-context'] },
      { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B Instruct (Free)', contextWindow: 32768, pricing: 'FREE', tags: ['gratis', 'multilingüe'] },
      
      // Modelos Standard & Premium
      { id: 'openai/gpt-4o', name: 'GPT-4o', contextWindow: 128000, pricing: '$2.50/$10 por 1M tokens', tags: ['premium', 'openai', 'potente', 'multimodal'] },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, pricing: '$0.15/$0.60 por 1M tokens', tags: ['económico', 'openai', 'rápido'] },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', contextWindow: 200000, pricing: '$3/$15 por 1M tokens', tags: ['premium', 'anthropic', 'largo-contexto', '200k-context'] },
      { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', contextWindow: 200000, pricing: '$0.25/$1.25 por 1M tokens', tags: ['económico', 'anthropic', 'rápido'] },
      { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', contextWindow: 2000000, pricing: '$1.25/$5 por 1M tokens', tags: ['premium', 'google', '2M-context', 'multimodal'] },
      { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', contextWindow: 1000000, pricing: '$0.075/$0.30 por 1M tokens', tags: ['económico', 'google', '1M-context', 'rápido'] },
      
      // Powerful Open Source
      { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B Instruct', contextWindow: 131072, pricing: '$2.70/$2.70 por 1M tokens', tags: ['premium', 'código-abierto', 'muy-potente', 'meta'] },
      { id: 'mistralai/mistral-large', name: 'Mistral Large', contextWindow: 131072, pricing: '$2/$6 por 1M tokens', tags: ['premium', 'mistral', 'multilingüe'] },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', contextWindow: 64000, pricing: '$0.14/$0.28 por 1M tokens', tags: ['económico', 'chino', 'coding'] },
      { id: 'x-ai/grok-beta', name: 'Grok Beta', contextWindow: 131072, pricing: '$5/$10 por 1M tokens', tags: ['premium', 'x-ai', 'twitter'] },
      { id: 'perplexity/llama-3.1-sonar-large-128k-online', name: 'Perplexity Sonar Large Online', contextWindow: 127072, pricing: '$1/$1 por 1M tokens', tags: ['búsqueda-web', 'perplexity', 'online'] },
      
      // Modelos Especializados / Legacy Popular
      { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, pricing: '$10/$30 por 1M tokens', tags: ['premium', 'openai', 'vision'] },
      { id: 'anthropic/claude-opus-3', name: 'Claude Opus 3', contextWindow: 200000, pricing: '$15/$75 por 1M tokens', tags: ['premium', 'anthropic', 'top-tier'] },
      { id: 'cohere/command-r-plus', name: 'Cohere Command R+', contextWindow: 128000, pricing: '$2.50/$10 por 1M tokens', tags: ['premium', 'cohere', 'rag'] },
      { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B', contextWindow: 131072, pricing: '$0.35/$0.40 por 1M tokens', tags: ['nvidia', 'código-abierto'] },
      { id: 'nousresearch/hermes-3-llama-3.1-405b', name: 'Hermes 3 405B', contextWindow: 131072, pricing: '$2/$2', tags: ['uncensored', 'roleplay'] },
      { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax L2 13B', contextWindow: 4096, pricing: '$0.10/$0.10', tags: ['roleplay', 'storytelling'] },
    ]
  },

  {
    id: 'together',
    name: 'Together AI',
    description: 'Plataforma de inferencia rápida para modelos de código abierto con precios competitivos',
    apiKeyUrl: 'https://api.together.xyz/settings/api-keys',
    docsUrl: 'https://docs.together.ai/',
    categories: ['text_generation', 'image_generation', 'grammar', 'humanization'],
    tags: ['agregador', 'código-abierto', 'rápido', 'económico'],
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B Instruct Turbo', contextWindow: 130815, pricing: '$3.50/$3.50 por 1M tokens', tags: ['potente', 'meta'] },
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Instruct Turbo', contextWindow: 131072, pricing: '$0.88/$0.88 por 1M tokens', tags: ['potente', 'rápido'] },
      { id: 'meta-llama/Meta-Llama-3-70B-Instruct-Turbo', name: 'Llama 3 70B Instruct Turbo', contextWindow: 8192, pricing: '$0.88/$0.88 por 1M tokens', tags: ['rápido'] },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B Instruct', contextWindow: 32768, pricing: '$0.60/$0.60 por 1M tokens', tags: ['económico', 'moe'] },
      { id: 'mistralai/Mistral-7B-Instruct-v0.2', name: 'Mistral 7B Instruct v0.2', contextWindow: 32768, pricing: '$0.20/$0.20 por 1M tokens', tags: ['económico', 'rápido'] },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B Instruct Turbo', contextWindow: 32768, pricing: '$1.20/$1.20 por 1M tokens', tags: ['multilingüe', 'potente'] },
      { id: 'deepseek-ai/deepseek-llm-67b-chat', name: 'DeepSeek LLM 67B Chat', contextWindow: 4096, pricing: '$0.90/$0.90 por 1M tokens', tags: ['chino', 'coding'] },
      { id: 'black-forest-labs/FLUX.1-schnell', name: 'FLUX.1 Schnell', pricing: '$0.003 por imagen', tags: ['imagen', 'rápido', 'gratis'] },
      { id: 'stabilityai/stable-diffusion-xl-base-1.0', name: 'Stable Diffusion XL', pricing: '$0.002 por imagen', tags: ['imagen', 'económico'] },
    ]
  },

  {
    id: 'huggingface',
    name: 'Hugging Face Inference',
    description: 'Acceso a miles de modelos de código abierto hospedados en Hugging Face',
    apiKeyUrl: 'https://huggingface.co/settings',
    docsUrl: 'https://huggingface.co/docs/api-inference/',
    categories: ['text_generation', 'image_generation', 'grammar', 'humanization'],
    tags: ['agregador', 'código-abierto', 'flexible', 'gratis-limitado'],
    models: [
      { id: 'meta-llama/Llama-3.2-3B-Instruct', name: 'Llama 3.2 3B Instruct', tags: ['gratis', 'ligero'] },
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B Instruct v0.3', tags: ['gratis', 'rápido'] },
      { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B IT', tags: ['gratis', 'google'] },
      { id: 'stabilityai/stable-diffusion-3-medium', name: 'Stable Diffusion 3 Medium', tags: ['imagen', 'gratis'] },
    ]
  },

  {
    id: 'replicate',
    name: 'Replicate',
    description: 'Plataforma para ejecutar modelos de IA open-source en la nube con pago por uso',
    apiKeyUrl: 'https://replicate.com/account/api-tokens',
    docsUrl: 'https://replicate.com/docs',
    categories: ['text_generation', 'image_generation', 'grammar', 'humanization'],
    tags: ['agregador', 'código-abierto', 'flexible', 'pago-por-uso'],
    models: [
      { id: 'tencent/hunyuandit', name: 'HunyuanDiT (Tencent)', pricing: '$0.04 por imagen', tags: ['imagen', 'asiático', 'nuevo'] },
      { id: 'meta/llama-2-70b-chat', name: 'Llama 2 70B Chat', pricing: '$0.65/$2.75 por 1M tokens', tags: ['potente'] },
      { id: 'mistralai/mixtral-8x7b-instruct-v0.1', name: 'Mixtral 8x7B Instruct', pricing: '$0.30/$1.00 por 1M tokens', tags: ['económico'] },
      { id: 'stability-ai/sdxl', name: 'Stable Diffusion XL', pricing: '$0.0035 por imagen', tags: ['imagen'] },
      { id: 'black-forest-labs/flux-schnell', name: 'FLUX Schnell', pricing: '$0.003 por imagen', tags: ['imagen', 'rápido'] },
    ]
  },

  // ========== PROVEEDORES DIRECTOS ==========
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Proveedor líder de modelos GPT-5 y DALL-E 3 con las mejores capacidades',
    apiKeyUrl: 'https://platform.openai.com',
    docsUrl: 'https://platform.openai.com',
    // CLONED TO ALL CATEGORIES
    categories: ['text_generation', 'image_generation', 'grammar', 'humanization'],
    tags: ['premium', 'líder', 'multimodal', 'popular'],
    models: [
      { id: 'gpt-5.2', name: 'GPT-5.2', contextWindow: 200000, pricing: '$5/$20 por 1M tokens', tags: ['sota', 'premium', 'dec-2025'] },
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, pricing: '$2.50/$10 por 1M tokens', tags: ['premium', 'multimodal', 'potente'] },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, pricing: '$0.15/$0.60 por 1M tokens', tags: ['económico', 'rápido'] },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, pricing: '$10/$30 por 1M tokens', tags: ['premium', 'vision'] },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385, pricing: '$0.50/$1.50 por 1M tokens', tags: ['económico', 'legacy'] },
      { id: 'dall-e-3', name: 'DALL-E 3', pricing: '$0.040-$0.120 por imagen', tags: ['imagen', 'premium', 'alta-calidad'] },
      { id: 'dall-e-2', name: 'DALL-E 2', pricing: '$0.016-$0.020 por imagen', tags: ['imagen', 'económico'] },
    ]
  },

  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Creadores de Claude, modelos con contexto de hasta 200K tokens y razonamiento superior',
    apiKeyUrl: 'https://console.anthropic.com',
    docsUrl: 'https://docs.anthropic.com/',
    // CLONED TO ALL CATEGORIES
    categories: ['text_generation', 'image_generation', 'grammar', 'humanization'],
    tags: ['premium', 'largo-contexto', 'seguro', 'razonamiento'],
    models: [
      { id: 'claude-4.5-opus', name: 'Claude 4.5 Opus', contextWindow: 200000, pricing: '$25/$100 por 1M tokens', tags: ['sota', 'premium', 'dec-2025'] },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000, pricing: '$3/$15 por 1M tokens', tags: ['premium', 'potente', '200k-context'] },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000, pricing: '$15/$75 por 1M tokens', tags: ['top-tier', 'máximo-rendimiento'] },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', contextWindow: 200000, pricing: '$3/$15 por 1M tokens', tags: ['balanceado'] },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', contextWindow: 200000, pricing: '$0.25/$1.25 por 1M tokens', tags: ['económico', 'rápido'] },
    ]
  },

  {
    id: 'google',
    name: 'Google AI (Gemini)',
    description: 'Modelos Gemini de Google con contexto de hasta 2M tokens y capacidades multimodales',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/docs',
    // CLONED TO ALL CATEGORIES
    categories: ['text_generation', 'image_generation', 'grammar', 'humanization'],
    tags: ['premium', 'largo-contexto', 'multimodal', 'google'],
    models: [
      { id: 'gemini-3.0-pro', name: 'Gemini 3.0 Pro', contextWindow: 2000000, pricing: '$1.50/$6 por 1M tokens', tags: ['sota', 'premium', 'dec-2025'] },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental', contextWindow: 1000000, pricing: 'FREE (experimental)', tags: ['gratis', 'experimental', '1M-context'] },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2000000, pricing: '$1.25/$5 por 1M tokens', tags: ['premium', '2M-context', 'multimodal'] },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1000000, pricing: '$0.075/$0.30 por 1M tokens', tags: ['económico', '1M-context', 'rápido'] },
      { id: 'gemini-pro', name: 'Gemini Pro', contextWindow: 32760, pricing: 'FREE', tags: ['gratis', 'legacy'] },
    ]
  },

  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Startup francesa con modelos eficientes y multilingües de alta calidad',
    apiKeyUrl: 'https://console.mistral.ai/api-keys/',
    docsUrl: 'https://docs.mistral.ai/',
    // CLONED TO ALL CATEGORIES
    categories: ['text_generation', 'image_generation', 'grammar', 'humanization'],
    tags: ['premium', 'multilingüe', 'europeo', 'eficiente'],
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', contextWindow: 131072, pricing: '$2/$6 por 1M tokens', tags: ['premium', 'potente'] },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', contextWindow: 32768, pricing: '$2.50/$7.50 por 1M tokens', tags: ['balanceado'] },
      { id: 'mistral-small-latest', name: 'Mistral Small', contextWindow: 32768, pricing: '$0.20/$0.60 por 1M tokens', tags: ['económico', 'rápido'] },
      { id: 'open-mixtral-8x7b', name: 'Mixtral 8x7B', contextWindow: 32768, pricing: '$0.70/$0.70 por 1M tokens', tags: ['código-abierto', 'moe'] },
    ]
  },

  {
    id: 'cohere',
    name: 'Cohere',
    description: 'Modelos especializados en generación de texto, búsqueda y clasificación empresarial',
    apiKeyUrl: 'https://dashboard.cohere.com/api-keys',
    docsUrl: 'https://docs.cohere.com/',
    categories: ['text_generation', 'grammar', 'humanization'],
    tags: ['premium', 'empresarial', 'rag', 'búsqueda'],
    models: [
      { id: 'command-r-plus', name: 'Command R+', contextWindow: 128000, pricing: '$2.50/$10 por 1M tokens', tags: ['premium', 'rag'] },
      { id: 'command-r', name: 'Command R', contextWindow: 128000, pricing: '$0.15/$0.60 por 1M tokens', tags: ['económico'] },
      { id: 'command', name: 'Command', contextWindow: 4096, pricing: '$1/$2 por 1M tokens', tags: ['legacy'] },
    ]
  },

  {
    id: 'perplexity',
    name: 'Perplexity AI',
    description: 'Modelos con acceso a búsqueda en tiempo real para información actualizada',
    apiKeyUrl: 'https://www.perplexity.ai',
    docsUrl: 'https://docs.perplexity.ai/',
    // CLONED TO ALL CATEGORIES
    categories: ['text_generation', 'image_generation', 'grammar', 'humanization'],
    tags: ['búsqueda-web', 'online', 'actualizado', 'investigación'],
    models: [
      { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large Online', contextWindow: 127072, pricing: '$1/$1 por 1M tokens', tags: ['búsqueda-web', 'potente'] },
      { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small Online', contextWindow: 127072, pricing: '$0.20/$0.20 por 1M tokens', tags: ['búsqueda-web', 'económico'] },
      { id: 'llama-3.1-sonar-huge-128k-online', name: 'Sonar Huge Online', contextWindow: 127072, pricing: '$5/$5 por 1M tokens', tags: ['búsqueda-web', 'premium'] },
    ]
  },

  {
    id: 'groq',
    name: 'Groq',
    description: 'Inferencia ultrarrápida (hasta 750 tokens/seg) con hardware especializado LPU',
    apiKeyUrl: 'https://console.groq.com/keys',
    docsUrl: 'https://console.groq.com/docs',
    // CLONED TO ALL CATEGORIES
    categories: ['text_generation', 'image_generation', 'grammar', 'humanization'],
    tags: ['ultra-rápido', 'hardware-especializado', 'gratis-limitado', 'velocidad'],
    models: [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile', contextWindow: 131072, pricing: 'FREE (límite de tasa)', tags: ['gratis', 'ultra-rápido'] },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', contextWindow: 131072, pricing: 'FREE (límite de tasa)', tags: ['gratis', 'instantáneo'] },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768, pricing: 'FREE (límite de tasa)', tags: ['gratis', 'rápido'] },
      { id: 'gemma-7b-it', name: 'Gemma 7B IT', contextWindow: 8192, pricing: 'FREE (límite de tasa)', tags: ['gratis', 'google'] },
    ]
  },

  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'La IA china más potente y económica (V3/R1). Especializada en código y razonamiento.',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    docsUrl: 'https://platform.deepseek.com/docs',
    categories: ['text_generation', 'grammar', 'humanization'],
    tags: ['económico', 'coding', 'matemáticas', 'chino'],
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)', contextWindow: 64000, pricing: '$0.27/$1.10 por 1M (Cache: $0.07)', tags: ['económico', 'sota', 'v3'] },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoner)', contextWindow: 64000, pricing: '$0.55/$2.19 por 1M', tags: ['razonamiento', 'chain-of-thought'] },
    ]
  },

  {
    id: 'qwen',
    name: 'Alibaba Cloud (Qwen)',
    description: 'Modelos Qwen líderes en benchmarks. Muy económicos y potentes.',
    apiKeyUrl: 'https://bailian.console.aliyun.com/',
    docsUrl: 'https://help.aliyun.com/document_detail/2712569.html?spm=a2c4g.2712569.0.0.5f9556350L400S',
    categories: ['text_generation', 'grammar', 'humanization'],
    tags: ['económico', 'potente', 'chino', 'multilingüe'],
    models: [
      { id: 'qwen-max', name: 'Qwen-Max', contextWindow: 30000, pricing: '$0.005/$0.02 (aprox)', tags: ['premium', 'sota'] },
      { id: 'qwen-plus', name: 'Qwen-Plus', contextWindow: 128000, pricing: 'Muy bajo', tags: ['balanceado', 'economy'] },
      { id: 'qwen-turbo', name: 'Qwen-Turbo', contextWindow: 128000, pricing: 'Ultra bajo', tags: ['rápido', 'economy'] },
    ]
  },

  {
    id: 'zhipu',
    name: 'Zhipu AI (GLM)',
    description: 'Creadores de ChatGLM. Excelente rendimiento en español y contextos largos.',
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    docsUrl: 'https://open.bigmodel.cn/dev/howuse/introduction',
    categories: ['text_generation', 'humanization'],
    tags: ['económico', 'bilingüe', 'chino'],
    models: [
      { id: 'glm-4', name: 'GLM-4', contextWindow: 128000, pricing: '$14/$14 por 1M (aprox)', tags: ['premium'] },
      { id: 'glm-4-flash', name: 'GLM-4 Flash', contextWindow: 128000, pricing: 'Gratis/Muy bajo', tags: ['gratis', 'rápido'] },
      { id: 'glm-4-air', name: 'GLM-4 Air', contextWindow: 128000, pricing: 'Económico', tags: ['balanceado'] },
    ]
  },

  {
    id: 'yi',
    name: '01.AI (Yi)',
    description: 'Modelos Yi con ventana de contexto de 200k. Excelente calidad literaria.',
    apiKeyUrl: 'https://platform.01.ai/',
    docsUrl: 'https://platform.01.ai/docs',
    categories: ['text_generation'],
    tags: ['largo-contexto', 'narrativo'],
    models: [
      { id: 'yi-large', name: 'Yi-Large', contextWindow: 32000, pricing: '$3/$3 por 1M', tags: ['calidad', 'premium'] },
      { id: 'yi-medium', name: 'Yi-Medium', contextWindow: 16000, pricing: 'Económico', tags: ['balanceado'] },
    ]
  },

  {
    id: 'ai21',
    name: 'AI21 Labs',
    description: 'Modelos Jurassic optimizados para generación de texto de alta calidad',
    apiKeyUrl: 'https://studio.ai21.com/account/api-key',
    docsUrl: 'https://docs.ai21.com/',
    categories: ['text_generation', 'grammar', 'humanization'],
    tags: ['premium', 'calidad', 'empresarial'],
    models: [
      { id: 'jamba-instruct', name: 'Jamba Instruct', contextWindow: 256000, pricing: '$0.50/$0.70 por 1M tokens', tags: ['largo-contexto', '256k-context'] },
      { id: 'j2-ultra', name: 'Jurassic-2 Ultra', contextWindow: 8192, pricing: '$15/$15 por 1M tokens', tags: ['premium'] },
      { id: 'j2-mid', name: 'Jurassic-2 Mid', contextWindow: 8192, pricing: '$10/$10 por 1M tokens', tags: ['balanceado'] },
    ]
  },

  // ========== GENERACIÓN DE IMÁGENES ==========
  {
    id: 'stability',
    name: 'Stability AI',
    description: 'Creadores de Stable Diffusion, líder en generación de imágenes open-source',
    apiKeyUrl: 'https://platform.stability.ai/account/keys',
    docsUrl: 'https://platform.stability.ai/docs',
    categories: ['image_generation'],
    tags: ['imagen', 'código-abierto', 'flexible', 'personalizable'],
    models: [
      { id: 'stable-diffusion-3-large', name: 'Stable Diffusion 3 Large', pricing: '$0.065 por imagen', tags: ['premium', 'alta-calidad'] },
      { id: 'stable-diffusion-3-medium', name: 'Stable Diffusion 3 Medium', pricing: '$0.035 por imagen', tags: ['balanceado'] },
      { id: 'stable-diffusion-xl-1024-v1-0', name: 'SDXL 1.0', pricing: '$0.020 por imagen', tags: ['económico', 'popular'] },
      { id: 'sd3-turbo', name: 'SD3 Turbo', pricing: '$0.040 por imagen', tags: ['rápido'] },
    ]
  },

  {
    id: 'midjourney',
    name: 'Midjourney',
    description: 'Generación de imágenes artísticas de máxima calidad (vía Discord)',
    apiKeyUrl: 'https://www.midjourney.com/account/',
    docsUrl: 'https://docs.midjourney.com/',
    categories: ['image_generation'],
    tags: ['imagen', 'premium', 'artístico', 'alta-calidad', 'no-api'],
    models: [
      { id: 'midjourney-v6', name: 'Midjourney V6', pricing: '$10-$120/mes (suscripción)', tags: ['premium', 'artístico'] },
    ]
  },

  {
    id: 'ideogram',
    name: 'Ideogram',
    description: 'Generación de imágenes con excelente manejo de texto dentro de las imágenes',
    apiKeyUrl: 'https://ideogram.ai/api',
    docsUrl: 'https://api-docs.ideogram.ai/',
    categories: ['image_generation'],
    tags: ['imagen', 'texto-en-imagen', 'tipografía', 'premium'],
    models: [
      { id: 'ideogram-v2', name: 'Ideogram V2', pricing: '$0.08 por imagen', tags: ['texto-en-imagen', 'premium'] },
      { id: 'ideogram-v1', name: 'Ideogram V1', pricing: '$0.04 por imagen', tags: ['económico'] },
    ]
  },

  {
    id: 'leonardo',
    name: 'Leonardo.AI',
    description: 'Plataforma de generación de imágenes con control de estilo y consistencia',
    apiKeyUrl: 'https://app.leonardo.ai/settings',
    docsUrl: 'https://docs.leonardo.ai/',
    categories: ['image_generation'],
    tags: ['imagen', 'control-estilo', 'consistencia', 'gaming'],
    models: [
      { id: 'leonardo-phoenix', name: 'Leonardo Phoenix', pricing: '$0.025 por imagen', tags: ['premium', 'alta-calidad'] },
      { id: 'leonardo-diffusion-xl', name: 'Leonardo Diffusion XL', pricing: '$0.015 por imagen', tags: ['económico'] },
    ]
  },

  {
    id: 'runwayml',
    name: 'Runway ML',
    description: 'Generación de imágenes y video con herramientas creativas avanzadas',
    apiKeyUrl: 'https://app.runwayml.com/settings',
    docsUrl: 'https://docs.runwayml.com/',
    categories: ['image_generation'],
    tags: ['imagen', 'video', 'creativo', 'premium'],
    models: [
      { id: 'runway-gen3', name: 'Runway Gen-3', pricing: 'Variable por proyecto', tags: ['video', 'premium'] },
    ]
  },

  // ========== OTROS PROVEEDORES ==========
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    description: 'Inferencia rápida de modelos open-source con precios competitivos',
    apiKeyUrl: 'https://fireworks.ai/api-keys',
    docsUrl: 'https://docs.fireworks.ai/',
    categories: ['text_generation', 'grammar', 'humanization'],
    tags: ['rápido', 'código-abierto', 'económico'],
    models: [
      { id: 'llama-v3p1-405b-instruct', name: 'Llama 3.1 405B Instruct', pricing: '$3/$3 por 1M tokens', tags: ['potente'] },
      { id: 'llama-v3p1-70b-instruct', name: 'Llama 3.1 70B Instruct', pricing: '$0.90/$0.90 por 1M tokens', tags: ['balanceado'] },
    ]
  },

  {
    id: 'anyscale',
    name: 'Anyscale Endpoints',
    description: 'Endpoints de modelos open-source optimizados con Ray',
    apiKeyUrl: 'https://console.anyscale.com/credentials',
    docsUrl: 'https://docs.anyscale.com/',
    categories: ['text_generation', 'grammar', 'humanization'],
    tags: ['código-abierto', 'ray', 'escalable'],
    models: [
      { id: 'meta-llama/Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B Instruct', pricing: '$1/$1 por 1M tokens', tags: ['económico'] },
    ]
  },

  {
    id: 'deepinfra',
    name: 'DeepInfra',
    description: 'Plataforma de inferencia para modelos open-source con GPU rápidas',
    apiKeyUrl: 'https://deepinfra.com/dash/api_keys',
    docsUrl: 'https://deepinfra.com/docs',
    categories: ['text_generation', 'image_generation'],
    tags: ['código-abierto', 'rápido', 'económico'],
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B Instruct', pricing: '$0.52/$0.75 por 1M tokens', tags: ['económico'] },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B', pricing: '$0.24/$0.24 por 1M tokens', tags: ['económico'] },
    ]
  },

  {
    id: 'lepton',
    name: 'Lepton AI',
    description: 'Plataforma de IA simplificada para desarrolladores',
    apiKeyUrl: 'https://dashboard.lepton.ai',
    docsUrl: 'https://www.lepton.ai',
    categories: ['text_generation', 'grammar', 'humanization'],
    tags: ['simple', 'desarrolladores', 'rápido'],
    models: [
      { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', pricing: '$0.70/$0.70 por 1M tokens', tags: ['económico'] },
    ]
  },

  {
    id: 'octoai',
    name: 'OctoAI',
    description: 'Inferencia optimizada de modelos generativos',
    apiKeyUrl: 'https://octo.ai',
    docsUrl: 'https://octo.ai/docs',
    categories: ['text_generation', 'image_generation'],
    tags: ['optimizado', 'generativo', 'rápido'],
    models: [
      { id: 'meta-llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', pricing: '$0.90/$0.90 por 1M tokens', tags: ['balanceado'] },
      { id: 'sdxl', name: 'Stable Diffusion XL', pricing: '$0.004 por imagen', tags: ['imagen', 'económico'] },
    ]
  },
];

// Categorías disponibles
export const CATEGORIES = [
  { id: 'text_generation', name: 'Generación de Texto', icon: '✍️' },
  { id: 'image_generation', name: 'Generación de Imágenes', icon: '🎨' },
  { id: 'grammar', name: 'Gramática y Corrección', icon: '📝' },
  { id: 'humanization', name: 'Humanización', icon: '👤' },
];

// Tags disponibles para filtrado
export const AVAILABLE_TAGS = [
  'gratis', 'free', 'premium', 'económico', 'rápido', 'potente',
  'multimodal', 'largo-contexto', 'código-abierto', 'agregador',
  'imagen', 'video', 'búsqueda-web', 'online', 'coding', 'matemáticas',
  'multilingüe', 'reasoning', 'vision', 'ultra-rápido', 'artístico',
];
