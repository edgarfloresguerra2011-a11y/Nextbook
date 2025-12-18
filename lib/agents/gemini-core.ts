
import { AIConfig, generateWithFallback } from '../ai-core';
import { callSerpApi } from '../services/serp-api';

export interface TrendReport {
  nicho: string;
  keywords: string[];
  score: number;
  reasoning?: string;
}

export interface EbookPlan {
  title: string;
  chapters: Array<{
    title: string;
    imageType: string;
    description?: string;
  }>;
  keywords: { primary: string[]; secondary: string[] };
  copywritingStructure: any;
  metadata: any;
}

export interface ImageContext {
  category: string;
  quality?: 'premium' | 'standard';
  budget?: 'high' | 'low';
}

export type Provider = 'banana_pro' | 'dalle3' | string;

export class GeminiCore {
  private config: AIConfig[];

  constructor(configs: AIConfig[]) {
    // Filter for Gemini configs
    this.config = configs.filter(c => c.provider === 'google');
  }

  async analyzeMarketTrends(topic: string = "trending non-fiction"): Promise<TrendReport> {
    console.log(`[GeminiCore] Analyzing trends for: ${topic}...`);
    
    // 1. Conectar a Google Trends / Search via SerpApi
    const searchData = await callSerpApi(topic);
    
    // 2. Análisis SEO con Gemini
    const systemPrompt = "Eres un analista de mercado experto en Amazon KDP.";
    const prompt = `Analiza estas tendencias de búsqueda y determina el mejor nicho para un ebook profesional:
    ${JSON.stringify(searchData.titles)}
    
    Considera:
    - Volumen de búsqueda (estimado)
    - Competencia
    - Potencial de monetización
    - Sostenibilidad del nicho
    
    Responde estrictamente en formato JSON con la siguiente estructura:
    {
      "nicho": "Nombre del nicho",
      "keywords": ["keyword1", "keyword2", ...],
      "score": 9.5,
      "reasoning": "Explicación breve"
    }`;

    try {
      const resultJson = await generateWithFallback(prompt, systemPrompt, this.config);
      let clean = resultJson.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch (e) {
      console.error("[GeminiCore] Error analyzing trends, using fallback data.");
      return {
        nicho: topic,
        keywords: [topic, "guide", "2025"],
        score: 7.0
      };
    }
  }

  async createContentPlan(research: TrendReport, desiredChapters: number = 10): Promise<EbookPlan> {
    console.log(`[GeminiCore] Creating content plan for nicho: ${research.nicho} (${desiredChapters} chapters)...`);
    
    const systemPrompt = "Eres un arquitecto de contenidos senior para una editorial digital.";
    const prompt = `Crea un plan detallado para un ebook profesional sobre: ${research.nicho}
    
    Debe incluir:
    - Título optimizado SEO (Magnético y comercial)
    - EXACTAMENTE ${desiredChapters} capítulos con títulos sugerentes
    - Tipo de imágenes necesarias por capítulo (descripción visual)
    - Keywords principales y secundarias
    - Estructura de copywriting (Outline)
    - Metadata para plataformas (Amazon KDP, Apple Books)
    
    Responde estrictamente en formato JSON con la siguiente estructura:
    {
      "title": "...",
      "chapters": [ { "title": "...", "imageType": "..." } ],
      "keywords": { "primary": [], "secondary": [] },
      "copywritingStructure": "...",
      "metadata": { "description": "...", "category": "..." }
    }`;

    try {
      const resultJson = await generateWithFallback(prompt, systemPrompt, this.config);
      let clean = resultJson.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch (e) {
      console.error("[GeminiCore] Error creating content plan, using minimal plan.");
      return {
        title: `Comprehensive Guide to ${research.nicho}`,
        chapters: [{ title: "Introduction to " + research.nicho, imageType: "professional" }],
        keywords: { primary: research.keywords, secondary: [] },
        copywritingStructure: "Standard guide flow",
        metadata: { description: "Expert guide.", category: "Non-fiction" }
      };
    }
  }

  async decideImageProvider(context: ImageContext): Promise<Provider> {
    // Gemini decide qué proveedor es mejor basado en el contexto
    // Lógica determinista inspirada en la sugerencia del usuario, 
    // pero podría ser una llamada a IA si fuera necesario.
    
    if (context.category === 'food' || context.category === 'recipes') {
      return context.quality === 'premium' ? 'banana_pro' : 'dalle3';
    }
    
    if (context.category === 'business' || context.category === 'selfhelp') {
      return 'dalle3'; // Más versátil para diagramas y personas
    }

    if (context.budget === 'low') {
      return 'dalle3'; // Generalmente más económico / accesible
    }

    return 'banana_pro'; // Default para alta calidad (Imagen 3 / Nano)
  }
}
