
import { AIConfig, generateTextCore } from '../ai-core';

export interface ChapterPlan {
    title: string;
    prompt: string;
    context?: string;
}

export interface RawContent {
    content: string;
    provider: string;
    quality: number;
}

export class TextEngine {
    private deepseekConfig: AIConfig | undefined;
    private openaiConfig: AIConfig | undefined;

    constructor(configs: AIConfig[]) {
        this.deepseekConfig = configs.find(c => c.provider === 'deepseek');
        this.openaiConfig = configs.find(c => c.provider === 'openai');
    }

    async generate(plan: ChapterPlan, tier?: 'premium' | 'standard'): Promise<RawContent> {
        const systemPrompt = "Eres un escritor profesional de ebooks. Tu objetivo es crear contenido de alta calidad, atractivo y bien estructurado.";
        
        // If premium, we skip DeepSeek and go straight to OpenAI or prioritize it differently
        if (tier === 'premium' && this.openaiConfig) {
            return this.generateWithOpenAI(plan, systemPrompt);
        }

        // PRIMARY: DeepSeek (velocidad + costo)
        if (this.deepseekConfig) {
            try {
                console.log(`[TextEngine] 🚀 Generating with DeepSeek: ${plan.title}`);
                const content = await generateTextCore(
                    plan.prompt,
                    systemPrompt,
                    { ...this.deepseekConfig, model: this.deepseekConfig.model || 'deepseek-chat' }
                );
                
                if (content && content.length > 100) {
                    return { content, provider: 'deepseek', quality: 0.8 };
                }
                throw new Error("Content too short from DeepSeek");
            } catch (error) {
                console.warn(`[TextEngine] ⚠️ DeepSeek failed, falling back to OpenAI: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // FALLBACK: OpenAI (calidad garantizada)
        if (this.openaiConfig) {
            return this.generateWithOpenAI(plan, systemPrompt);
        }

        throw new Error("No available text providers found for generation.");
    }

    private async generateWithOpenAI(plan: ChapterPlan, systemPrompt: string): Promise<RawContent> {
        if (!this.openaiConfig) throw new Error("OpenAI config required for premium generation.");
        try {
            console.log(`[TextEngine] 💎 Generating with OpenAI (GPT-4o/Turbo): ${plan.title}`);
            const content = await generateTextCore(
                plan.prompt,
                systemPrompt,
                { ...this.openaiConfig, model: this.openaiConfig.model || 'gpt-4o' }
            );
            return { content, provider: 'openai', quality: 0.95 };
        } catch (error) {
            console.error(`[TextEngine] ❌ OpenAI generation failed: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
}
