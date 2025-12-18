
import { AIConfig, generateTextCore } from '../ai-core';

export class QualityPipeline {
    private openaiConfig: AIConfig | undefined;
    private geminiConfig: AIConfig | undefined;

    constructor(configs: AIConfig[]) {
        this.openaiConfig = configs.find(c => c.provider === 'openai');
        this.geminiConfig = configs.find(c => c.provider === 'google');
    }

    async process(content: any): Promise<any> {
        console.log("[QualityPipeline] 💎 Starting Quality Enhancement Chain...");
        
        if (!content.chapters) return content;

        for (const chapter of content.chapters) {
            console.log(`   - Enhancing: ${chapter.title}`);
            
            // 1. Correction (OpenAI)
            chapter.content = await this.correct(chapter.content);
            
            // 2. Grammar (Gemini)
            chapter.content = await this.fixGrammar(chapter.content);
            
            // 3. Humanization (ChatGPT/OpenAI)
            chapter.content = await this.humanize(chapter.content);
        }

        return content;
    }

    private async correct(text: string): Promise<string> {
        if (!this.openaiConfig) return text;
        const prompt = `Corrige el siguiente texto buscando coherencia, fluidez y errores de estilo. Mantén el tono original. Retorna SOLO el texto corregido.\n\nTEXTO:\n${text}`;
        try {
            return await generateTextCore(prompt, "Eres un editor experto.", this.openaiConfig);
        } catch { return text; }
    }

    private async fixGrammar(text: string): Promise<string> {
        if (!this.geminiConfig) return text;
        const prompt = `Revisa gramática y ortografía del siguiente texto. Asegura una calidad editorial impecable. Retorna SOLO el texto corregido.\n\nTEXTO:\n${text}`;
        try {
            return await generateTextCore(prompt, "Eres un corrector gramatical estricto.", this.geminiConfig);
        } catch { return text; }
    }

    private async humanize(text: string): Promise<string> {
        if (!this.openaiConfig) return text;
        const prompt = `Reescribe el texto para que parezca escrito por un humano experto, evitando patrones comunes de IA. Aumenta la variabilidad de las oraciones y usa un vocabulario natural. Retorna SOLO el texto reescrito.\n\nTEXTO:\n${text}`;
        try {
            return await generateTextCore(prompt, "Eres un Ghostwriter profesional.", this.openaiConfig);
        } catch { return text; }
    }
}
