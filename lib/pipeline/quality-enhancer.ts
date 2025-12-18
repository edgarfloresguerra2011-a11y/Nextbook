
import { AIConfig, generateTextCore } from '../ai-core';

export interface RawContent {
    content: string;
    provider: string;
    quality: number;
}

export type EnhancedContent = string;

export class QualityEnhancer {
    private openaiConfig: AIConfig | undefined;
    private geminiConfig: AIConfig | undefined;

    constructor(configs: AIConfig[]) {
        this.openaiConfig = configs.find(c => c.provider === 'openai');
        this.geminiConfig = configs.find(c => c.provider === 'google');
    }

    async process(rawContent: RawContent): Promise<EnhancedContent> {
        console.log(`[QualityEnhancer] 🚀 Starting Professional Quality Chain (Input Quality: ${rawContent.quality})...`);
        
        // STAGE 1: Corrección (OpenAI GPT-4)
        const corrected = await this.correct(rawContent.content);
        
        // STAGE 2: Gramática (Gemini Flash - rápido)
        const grammar = await this.fixGrammar(corrected);
        
        // STAGE 3: Humanización (ChatGPT 4o)
        const humanized = await this.humanize(grammar);
        
        console.log(`[QualityEnhancer] ✅ Quality Chain completed.`);
        return humanized;
    }

    private async correct(content: string): Promise<string> {
        if (!this.openaiConfig) return content;
        
        try {
            console.log("   - [Stage 1] Professional Correction (GPT-4 Turbo)...");
            return await generateTextCore(
                `Corrige este texto:\n\n${content}`,
                "Eres un editor profesional. Corrige errores factuales, mejora la claridad y mantén el tono profesional.",
                { ...this.openaiConfig, model: 'gpt-4-turbo' }
            );
        } catch (error) {
            console.warn("QualityEnhancer Stage 1 Failed, skipping.");
            return content;
        }
    }

    private async fixGrammar(content: string): Promise<string> {
        if (!this.geminiConfig) return content;
        
        try {
            console.log("   - [Stage 2] Grammatical Alignment (Gemini Flash)...");
            return await generateTextCore(
                `Revisa y corrige ÚNICAMENTE errores gramaticales y ortográficos. No cambies el estilo ni el tono. Solo gramática perfecta.\n\nTexto:\n${content}`,
                "Eres un corrector gramatical impecable.",
                { ...this.geminiConfig, model: 'gemini-2.0-flash-exp' }
            );
        } catch (error) {
            console.warn("QualityEnhancer Stage 2 Failed, skipping.");
            return content;
        }
    }

    private async humanize(content: string): Promise<string> {
        if (!this.openaiConfig) return content;
        
        try {
            console.log("   - [Stage 3] KDP Humanization (GPT-4o Agent)...");
            return await generateTextCore(
                content,
                `Eres un escritor humano experto. Reescribe el texto para que suene 100% natural, como si lo hubiera escrito un humano con años de experiencia. 
                
                Características:
                - Variación en longitud de oraciones
                - Transiciones naturales
                - Anécdotas ocasionales
                - Tono conversacional pero profesional
                - Sin detectarse como IA`,
                { ...this.openaiConfig, model: 'gpt-4o' }
            );
        } catch (error) {
            console.warn("QualityEnhancer Stage 3 Failed, skipping.");
            return content;
        }
    }
}
