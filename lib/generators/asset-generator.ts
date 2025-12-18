
import { AIConfig } from '../ai-core';
import { ImageEngine } from './image-engine';

export class AssetGenerator {
    private imageEngine: ImageEngine;

    constructor(configs: AIConfig[]) {
        this.imageEngine = new ImageEngine(configs);
    }

    async create(content: any): Promise<any[]> {
        console.log("[AssetGenerator] 🎨 Creating Professional Assets...");
        const assets = [];

        // 1. Generate Cover
        const cover = await this.imageEngine.generate({
            prompt: `Professional book cover for "${content.title}". ${content.metadata?.description || ''}`,
            category: 'book_cover',
            quality: 'premium',
            style: '3D luxury render, cinematic lighting'
        });
        assets.push({ type: 'cover', url: cover.url, provider: cover.provider });

        // 2. Generate Chapter Images
        if (content.chapters) {
            for (const chapter of content.chapters) {
                const img = await this.imageEngine.generate({
                    prompt: `Illustration for chapter: ${chapter.title}. ${chapter.imageType || ''}`,
                    category: content.metadata?.category?.toLowerCase().includes('food') ? 'food' : 'general',
                    quality: 'standard'
                });
                chapter.imageUrl = img.url;
                assets.push({ type: 'chapter_image', chapter: chapter.title, url: img.url, provider: img.provider });
            }
        }

        return assets;
    }
}
