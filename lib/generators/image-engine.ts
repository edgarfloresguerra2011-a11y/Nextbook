
import { AIConfig } from '../ai-core';

export interface ImageContext {
    prompt: string;
    category?: string;
    quality?: 'premium' | 'standard';
    style?: string;
}

export interface GeneratedImage {
    url: string;
    provider: string;
    metadata?: any;
}

export interface BookMetadata {
    title: string;
    category: string;
    description?: string;
}

export interface Chapter {
    title: string;
    content: string;
}

export class ImageEngine {
    private configs: AIConfig[];

    constructor(configs: AIConfig[]) {
        this.configs = configs;
    }

    async generateCover(metadata: BookMetadata): Promise<GeneratedImage> {
        console.log(`[ImageEngine] 📘 Generating Cover for: ${metadata.title}...`);
        
        // Oracle decision simulation (based on user snippet logic)
        const isPremium = true; // Covers always premium
        const provider = (metadata.category === 'cooking' || metadata.category === 'lifestyle') ? 'banana_pro' : 'dalle3';

        if (provider === 'banana_pro') {
            return await this.generateWithBananaPro(metadata);
        } else {
            return await this.generateWithDALLE(metadata);
        }
    }

    private async generateWithBananaPro(metadata: BookMetadata): Promise<GeneratedImage> {
        const config = this.configs.find(c => c.provider === 'google'); // Mapping "Banana Pro" to Google Nano/Imagen in this ecosystem
        const apiKey = config?.apiKey || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            console.warn("[ImageEngine] No Google/Banana API key found, falling back to DALL-E");
            return this.generateWithDALLE(metadata);
        }

        const prompt = this.buildProfessionalPrompt(metadata);
        
        // Unified Google Imagen Support
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [{ prompt }],
                parameters: { sampleCount: 1 }
            })
        });

        if (response.ok) {
            const data = await response.json();
            const b64 = data.predictions?.[0]?.bytesBase64Encoded;
            if (b64) {
                return {
                    url: `data:image/png;base64,${b64}`,
                    provider: 'banana_pro',
                    metadata: { dimensions: '1024x1024', quality: 'ultra_high', optimizedFor: 'print' }
                };
            }
        }

        return this.generateWithDALLE(metadata);
    }

    private async generateWithDALLE(metadata: BookMetadata): Promise<GeneratedImage> {
        const config = this.configs.find(c => c.provider === 'openai');
        const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;

        if (!apiKey) throw new Error("No OpenAI API key found for DALL-E");

        const prompt = this.buildProfessionalPrompt(metadata);

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: prompt,
                n: 1, size: "1024x1024", quality: "standard", response_format: "url"
            })
        });

        if (response.ok) {
            const data = await response.json();
            return {
                url: data.data?.[0]?.url,
                provider: 'openai',
                metadata: { dimensions: '1024x1024', format: 'url' }
            };
        }

        throw new Error("DALL-E Generation failed");
    }

    private buildProfessionalPrompt(metadata: BookMetadata): string {
        const basePrompt = `Professional book cover for "${metadata.title}"`;
        
        const styleMap: Record<string, string> = {
          'cooking': 'food photography, rustic, warm lighting, ingredients visible',
          'business': 'corporate, modern, minimalist, professional',
          'selfhelp': 'inspiring, bright colors, motivational imagery',
          'fiction': 'cinematic, dramatic, atmospheric'
        };

        const style = styleMap[metadata.category] || 'professional, high-end';
        return `${basePrompt}. Style: ${style}. Magazine quality, 8K resolution, professional lighting, commercial photography`;
    }

    async generateChapterImages(chapter: Chapter): Promise<GeneratedImage[]> {
        console.log(`[ImageEngine] 📖 Generating Chapter Images for: ${chapter.title}...`);
        
        const imageType = this.detectImageType(chapter.content);
        const metadata: BookMetadata = { title: chapter.title, category: imageType };

        let result: GeneratedImage;
        if (imageType === 'food' || imageType === 'fitness') {
            result = await this.generateWithBananaPro(metadata);
        } else {
            result = await this.generateWithDALLE(metadata);
        }

        return [result];
    }

    private detectImageType(content: string): string {
        const lower = content.toLowerCase();
        if (lower.includes('receta') || lower.includes('ingredientes') || lower.includes('cooking') || lower.includes('food')) {
          return 'food';
        }
        if (lower.includes('ejercicio') || lower.includes('entrenamiento') || lower.includes('fitness') || lower.includes('workout')) {
          return 'fitness';
        }
        return 'generic';
    }

    // Generic generate for other uses
    async generate(context: ImageContext): Promise<GeneratedImage> {
        const metadata: BookMetadata = { 
            title: context.prompt, 
            category: context.category || 'generic' 
        };
        
        if (context.quality === 'premium' || context.category === 'food') {
            return this.generateWithBananaPro(metadata);
        }
        return this.generateWithDALLE(metadata);
    }
}
