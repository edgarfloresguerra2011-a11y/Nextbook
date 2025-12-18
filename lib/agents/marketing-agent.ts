
import { generateWithFallback, AIConfig } from '../ai-core';
import { callSerpApi } from '../services/serp-api'; 

interface BookBlueprint {
    trendAnalysis: any;
    bookMetadata: {
        title: string;
        genre: string;
        description: string;
        keywords?: string[];
        [key: string]: any;
    };
    chapters: any[];
}

// --- 1. EL ESTRATEGA (SEO & DATOS) ---
const SYSTEM_STRATEGIST = `
Eres "El Estratega", un experto en SEO para Amazon KDP y Google Books.
Tu objetivo es puramente ANALÍTICO.
Analiza las tendencias de búsqueda y define la estrategia de posicionamiento.
`;

// --- 2. EL PERSUASOR (PSICOLOGÍA DE VENTAS) ---
const SYSTEM_PERSUADER = `
Eres "El Persuasor", un copywriter de élite (nivel Gary Halbert / Ogilvy).
Tu objetivo es puramente EMOCIONAL y COMERCIAL.
No te importan los datos técnicos, solo VENDER.
Toma los keywords del Estratega y teje una historia irresistible.
`;

export async function analyzeMarketAndOptimize(
    blueprint: BookBlueprint, 
    topic: string,
    priorityStack: AIConfig[] // Recibe el stack YA ordenado por el Oráculo
) {
    console.log(`[Marketing 5.2] Iniciando secuencia: Estratega -> Persuasor`);

    // PASO A: Búsqueda de Tendencias (El Estratega necesita munición)
    const serpResults = await callSerpApi(topic); 
    const searchContext = JSON.stringify(serpResults.titles.slice(0, 7)); 

    // --- FASE 1: EL ESTRATEGA (Definición de Keywords y Ángulo) ---
    // Usamos el stack tal cual viene (el Oráculo ya decidió si priorizar costo o precisión)
    // Pero para SEO, idealmente queremos modelos con conocimiento actualizado si es posible.
    
    const strategistPrompt = `
    Tema: ${topic}
    Contexto Mercado (Google): ${searchContext}
    Blueprint Actual: ${JSON.stringify(blueprint.trendAnalysis)}

    TAREA DEL ESTRATEGA:
    1. Analiza los títulos de la competencia.
    2. Identifica 10 "Money Keywords" (mezcla de short-tail y long-tail).
    3. Analiza el potencial de mercado (Volumen de búsqueda, Competencia, Monetización).
    4. Define el "Ángulo de Ataque" (¿Qué hace único a este libro?).
    5. Propón un Título SEO Técnico (optimizado para el algoritmo, no necesariamente bonito).

    SALIDA JSON:
    {
       "market_angle": "...",
       "seo_keywords": ["...", "..."],
       "technical_title": "...",
       "metrics": {
          "searchVolume": 125000, 
          "competition": "medium", 
          "monetizationPotential": 9.2
       }
    }
    `;

    let strategyData;
    try {
        console.log(`[Marketing] 🧠 El Estratega está pensando...`);
        const strategyJson = await generateWithFallback(strategistPrompt, SYSTEM_STRATEGIST, priorityStack);
        
        let clean = strategyJson.replace(/```json/g, '').replace(/```/g, '').trim();
        const first = clean.indexOf('{'); const last = clean.lastIndexOf('}');
        if (first !== -1 && last !== -1) clean = clean.substring(first, last+1);
        strategyData = JSON.parse(clean);

    } catch (e) {
        console.warn("[Marketing] Falló El Estratega, usando datos básicos.", e);
        strategyData = { seo_keywords: [topic, "guide", "best seller"], technical_title: topic };
    }


    // --- FASE 2: EL PERSUASOR (El Arte de la Venta) ---
    // Toma los datos fríos del Estratega y crea calor.
    
    const persuaderPrompt = `
    Input del Estratega:
    - Keywords: ${JSON.stringify(strategyData.seo_keywords)}
    - Título Técnico: ${strategyData.technical_title}
    - Ángulo: ${strategyData.market_angle || "General"}

    TAREA DEL PERSUASOR:
    1. Transforma el "Título Técnico" en un "TÍTULO BESTSELLER" (Magnético, corto, impactante).
    2. Escribe una SINOPSIS DE VENTA de 3 párrafos.
       - Párrafo 1: El Gancho (Dolor/Problema).
       - Párrafo 2: La Solución (Lo que aprenderás).
       - Párrafo 3: El Cierre (Llamada a la acción).
    3. Refina la Audiencia Objetivo.

    SALIDA JSON ESTRICTO:
    {
      "final_title": "...",
      "sales_synopsis": "...",
      "target_audience": "..."
    }
    `;

    try {
        console.log(`[Marketing] 🗣️ El Persuasor está escribiendo...`);
        const persuaderJson = await generateWithFallback(persuaderPrompt, SYSTEM_PERSUADER, priorityStack);
        
        let clean = persuaderJson.replace(/```json/g, '').replace(/```/g, '').trim();
        const first = clean.indexOf('{'); const last = clean.lastIndexOf('}');
        if (first !== -1 && last !== -1) clean = clean.substring(first, last+1);
        const salesData = JSON.parse(clean);

        // FUSIÓN Y RETORNO
        console.log("[Marketing] ✅ Secuencia completada. Título:", salesData.final_title);

        const updatedBlueprint = { ...blueprint };
        updatedBlueprint.bookMetadata.title = salesData.final_title || strategyData.technical_title;
        updatedBlueprint.bookMetadata.description = salesData.sales_synopsis;
        updatedBlueprint.bookMetadata.keywords = strategyData.seo_keywords;
        updatedBlueprint.trendAnalysis.targetAudience = salesData.target_audience;
        
        return updatedBlueprint;

    } catch (e) {
        console.error("[Marketing] Falló El Persuasor. Retornando estrategia base.", e);
        return blueprint;
    }
}
