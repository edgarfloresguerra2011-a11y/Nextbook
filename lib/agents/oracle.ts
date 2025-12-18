
import { generateWithFallback, AIConfig } from '../ai-core';

// --- DEFINICIONES DE TIPOS PARA LA ARQUITECTURA 5.2 ---

export type QualityTier = 'precision' | 'balanced' | 'cost_saving';
export type HumanizationLevel = 'shield_mode' | 'standard' | 'none';

export interface ProjectConfig {
    // Clasificación del Oráculo
    classification: {
        category: 'technical_reference' | 'narrative_fiction' | 'non_fiction_general' | 'cookbook';
        isSensitiveTopic: boolean; // Recetas, salud, finanzas -> Requiere ALTA precisión
    };
    
    // Pilas de Tecnología (Stacks)
    stacks: {
        writer: QualityTier;      // 'precision' (GPT-4o/Gemini Pro) vs 'cost_saving' (DeepSeek)
        humanizer: HumanizationLevel; 
        illustrator: 'high_res' | 'efficiency'; // Ideogram vs DeepSeek Janus
    };

    // Directrices Creativas Derivadas
    visualStyle: string; 
}

// --- LÓGICA DEL ORÁCULO ---

const SYSTEM_ORACLE = `
Eres "El Oráculo", el sistema de clasificación central de una editorial IA.
Tu trabajo es analizar el TEMA y GÉNERO del libro y definir la ESTÉTICA EDITORIAL (Layout Archetype).

ARCHETIPOS UNIFICADOS (MODERNOS):
1. **MAGAZINE**: Para Cocina, Estilo de Vida, Viajes, Moda. (Mucha foto, 2-3 columnas).
2. **PLAYBOOK**: Para "How-to", Guías Paso a Paso, Marketing, Autoayuda Práctica. (Estructurado, iconos, pasos).
3. **WHITEPAPER**: Para Finanzas, Tecnología Profunda, Legal, Ciencia. (Sobrio, gráficos, mininalista).
4. **NOVEL_DYNAMIC**: Para Ficción/Novelas. (Texto elegante, pero con páginas visuales de "aire" y citas).
5. **DYNAMIC_MIX**: Para Negocios Generales, Biografías, Ensayos. (Mezcla lo mejor de Magazine + Playbook).

SALIDA ESPERADA (JSON):
{
  "category": "cookbook" | "technical_reference" | "narrative_fiction" | "non_fiction_general" | "marketing" | "lifestyle",
  "archetype": "magazine" | "playbook" | "whitepaper" | "novel_dynamic" | "dynamic_mix",
  "reasoning": "Breve explicación..."
}
`;

export async function consultOracle(
    topic: string, 
    genre: string,
    allConfigs: AIConfig[],
    userOptions?: { budget?: 'premium' | 'standard' | 'economy'; chapters?: number; targetPlatform?: string[] }
): Promise<ProjectConfig> {
    
    // 1. Seleccionar el mejor modelo disponible para el Oráculo
    const oracleProviders = ['google', 'openai', 'anthropic']; 
    const oracleStack = allConfigs
        .filter(c => oracleProviders.includes(c.provider))
        .sort((a, b) => {
             if (a.provider === 'google') return -1; 
             if (a.provider === 'openai') return -1;
             return 1;
        });

    const finalStack = oracleStack.length > 0 ? oracleStack : allConfigs;

    try {
        const prompt = `Topic: "${topic}". Genre: "${genre}". Classify and decide Editorial Archetype. JSON only.`;
        
        const resultJson = await generateWithFallback(prompt, SYSTEM_ORACLE, finalStack);
        
        let decision;
        try {
            let clean = resultJson.replace(/```json/g, '').replace(/```/g, '').trim();
            const first = clean.indexOf('{'); const last = clean.lastIndexOf('}');
            if (first !== -1 && last !== -1) clean = clean.substring(first, last+1);
            decision = JSON.parse(clean);
        } catch (e) {
            console.warn("[Oracle] Falló parsing JSON, usando default MIX.");
            decision = { category: 'non_fiction_general', archetype: 'dynamic_mix', reasoning: 'Fallback' };
        }

        // --- MAPEO DE STACKS & PROMPTS (SISTEMA 5.3) ---
        
        let writerTier: QualityTier = 'balanced';
        let humanizerMode: HumanizationLevel = 'standard';
        let illustratorMode: 'high_res' | 'efficiency' = 'efficiency';
        
        // PROMPTS "CURADOS" (AS-IS from User inputs)
        const PROMPTS = {
            magazine: `Design a magazine-style ebook layout. Editorial photography, bold headlines, multi-column text. Modern typography, visual storytelling, dynamic page rhythm. Professional magazine aesthetic, premium editorial design.`,
            playbook: `Design a playbook-style ebook layout. Clear sections, numbered steps, modular blocks, icons and highlights. Structured, practical, modern business design. Clean layout optimized for digital reading.`,
            whitepaper: `Design a corporate whitepaper ebook layout. Minimalist, professional, data-driven design. Charts, tables, infographics, clean typography. Trustworthy, consulting-style visual language.`,
            brochure: `Design a brochure-style ebook layout. Large imagery, minimal text, elegant spacing. Modern lifestyle aesthetic, premium brand presentation. High visual impact, clean and sophisticated.`,
            mixed: `Design a dynamic multi-layout ebook. Mix magazine, playbook, and whitepaper styles. Vary page structures: full-image pages, multi-column text, modular sections. Strong visual hierarchy, premium editorial design. Optimized for professional digital publishing.`
        };

        const archetype = decision.archetype?.toLowerCase() || 'dynamic_mix';
        let selectedPrompt = PROMPTS.mixed; // Default to the "most powerful" one

        switch (archetype) {
            case 'magazine':
                selectedPrompt = PROMPTS.magazine;
                illustratorMode = 'high_res'; // Magazines need great photos
                break;
            case 'playbook':
                selectedPrompt = PROMPTS.playbook;
                break;
            case 'whitepaper':
                selectedPrompt = PROMPTS.whitepaper;
                writerTier = 'precision';
                break;
            case 'brochure':
                selectedPrompt = PROMPTS.brochure;
                illustratorMode = 'high_res';
                break;
            default:
                selectedPrompt = PROMPTS.mixed;
                break;
        }

        // Logic for Stacks based on Category (Preserving previous logic)
        if (['cookbook', 'technical_reference', 'health'].includes(decision.category)) {
            writerTier = 'precision';
            humanizerMode = 'shield_mode';
        } else if (decision.category === 'narrative_fiction') {
            writerTier = 'cost_saving';
            humanizerMode = 'shield_mode';
        }

        // OVERRIDE BASED ON USER BUDGET
        if (userOptions?.budget === 'premium') {
            writerTier = 'precision';
            console.log("[Oracle] 💰 User requested PREMIUM -> Forcing Precision Tier");
        } else if (userOptions?.budget === 'economy') {
            writerTier = 'cost_saving';
            console.log("[Oracle] 💰 User requested ECONOMY -> Forcing Cost Saving Tier");
        }

        const config: ProjectConfig = {
            classification: {
                category: decision.category,
                isSensitiveTopic: ['cookbook', 'technical_reference', 'health'].includes(decision.category)
            },
            stacks: {
                writer: writerTier,
                humanizer: humanizerMode,
                illustrator: illustratorMode
            },
            visualStyle: selectedPrompt // ESTO AHORA LLEVA EL PROMPT LISTO
        };
        
        console.log(`[Oracle] 🔮 Archetype: ${archetype.toUpperCase()} -> Prompt: "${config.visualStyle.substring(0, 30)}..."`);
        return config;

    } catch (error) {
        console.error("[Oracle] ❌ Error fatal. Usando configuración segura.", error);
        return {
            classification: { category: 'non_fiction_general', isSensitiveTopic: false },
            stacks: { writer: 'balanced', humanizer: 'shield_mode', illustrator: 'efficiency' },
            visualStyle: "Design a dynamic multi-layout ebook. Mix magazine, playbook, and whitepaper styles."
        };
    }
}

// Helper para construir la Pila de Prioridad basada en la decisión del Oráculo (Reglas STRICT PRO 5.2)
export function buildPriorityStack(tier: QualityTier, allConfigs: AIConfig[]): AIConfig[] {
    // Definición de Modelos por Capacidad (Hardcoded preference based on architecture rules)
    
    // Tier 1: "Cerebros" (High Reasoning)
    const brains = allConfigs.filter(c => 
        (c.provider === 'google' && c.model?.includes('pro')) || 
        (c.provider === 'openai' && c.model?.includes('gpt-4')) ||
        (c.provider === 'anthropic' && c.model?.includes('sonnet'))
    );

    // Tier 2: "Prosa & Código" (DeepSeek V3 is king here)
    const deepseek = allConfigs.filter(c => c.provider === 'deepseek' || c.model?.includes('deepseek'));

    // Tier 3: "Eficiencia" (Flash models, Haiku, etc)
    const efficiency = allConfigs.filter(c => 
        (c.provider === 'google' && c.model?.includes('flash')) || 
        (c.provider === 'openai' && c.model?.includes('mini')) ||
        (c.provider === 'groq') ||
        (c.provider === 'mistral')
    );

    const remainder = allConfigs.filter(c => ![...brains, ...deepseek, ...efficiency].includes(c));

    if (tier === 'precision') {
        // REGLA: Datos Críticos (Recetas, Salud). 
        // Stack: Gemini Pro -> GPT-4o -> DeepSeek V3. (CERO Alucinaciones)
        // Nota: DeepSeek V3 es muy bueno, pero Gemini 1.5 Pro tiene ventana de contexto masiva para referencias.
        return [...brains, ...deepseek, ...efficiency, ...remainder];
    } 
    else if (tier === 'cost_saving') { 
        // REGLA: Creatividad de Alto Rendimiento (Novelas).
        // Stack: DeepSeek V3 (Mejor prosa) -> Gemini Pro -> GPT-4o.
        // DeepSeek V3 supera a GPT-4o en fluidez narrativa en muchos benchmarks recientes.
        return [...deepseek, ...brains, ...efficiency, ...remainder];
    } 
    else {
        // Balanced / Default
        return [...deepseek, ...brains, ...efficiency, ...remainder];
    }
}
