
import { AIConfig, generateTextCore } from '../ai-core';
import { ImageEngine, BookMetadata } from '../generators/image-engine';

export interface Book {
  title: string;
  category: string;
  targetAudience: string;
  language: string;
  chapters: any[];
}

export interface SEOData {
  keywords: string[];
  subtitle?: string;
  longDescription?: string;
}

export interface Cover {
  url: string;
  provider: string;
  style: string;
}

export interface CoverSet { [platform: string]: Cover; }
export interface Mockup { type: string; url: string; }
export interface Marketing { [key: string]: any; }
export interface MultiPlatformMetadata { [platform: string]: any; }

export class ProfessionalAssets {
  private imageEngine: ImageEngine;
  private geminiConfig: AIConfig | undefined;

  constructor(configs: AIConfig[]) {
    this.imageEngine = new ImageEngine(configs);
    this.geminiConfig = configs.find(c => c.provider === 'google');
  }

  async generateCovers(book: Book): Promise<CoverSet> {
    console.log(`[ProfessionalAssets] 🎨 Generating A/B Cover Variants for: ${book.title}...`);
    
    const styles = ['minimalist', 'professional', 'bold', 'elegant', 'modern'];
    const variants = await Promise.all(styles.map(async (style) => {
      const metadata: BookMetadata = { 
        title: book.title, 
        category: book.category,
        description: `Style: ${style}`
      };
      const result = await this.imageEngine.generateCover(metadata);
      return { ...result, style };
    }));

    // Optimizar para cada plataforma (Simulation of platform-specific requirements)
    return {
      amazon_kdp: await this.optimizeForPlatform(variants[0], 'amazon'),
      apple_books: await this.optimizeForPlatform(variants[1], 'apple'),
      google_play: await this.optimizeForPlatform(variants[2], 'google'),
      kobo: await this.optimizeForPlatform(variants[3], 'kobo'),
      draft2digital: await this.optimizeForPlatform(variants[4], 'd2d')
    };
  }

  private async optimizeForPlatform(cover: any, platform: string): Promise<Cover> {
     // Here we would adjust dimensions/format for each platform
     return { ...cover, platform };
  }

  async generateMockups(cover: Cover): Promise<Mockup[]> {
    console.log("[ProfessionalAssets] 📐 Generating 3D Mockups...");
    const mockups: Mockup[] = [];

    // 1. Mockup de libro físico
    mockups.push(await this.create3DBookMockup(cover));

    // 2. Mockup en tablet
    mockups.push({ type: 'tablet', url: `https://mockup-api.com/tablet?img=${encodeURIComponent(cover.url)}` });

    // 3. Mockup en smartphone
    mockups.push({ type: 'smartphone', url: `https://mockup-api.com/phone?img=${encodeURIComponent(cover.url)}` });

    // 4. Scene lifestyle (libro en mesa con café, etc)
    mockups.push({ type: 'lifestyle', url: `https://mockup-api.com/lifestyle?img=${encodeURIComponent(cover.url)}` });

    return mockups;
  }

  private async create3DBookMockup(cover: Cover): Promise<Mockup> {
    // Simulation of an external mockup API as per user snippet
    // In a real environment, this might use a library like Canvas or a specialized cloud service.
    return {
        type: '3d_book',
        url: `https://api.mockup-generator.com/3d-book?cover=${encodeURIComponent(cover.url)}&quality=ultra`
    };
  }

  async generateCopywriting(book: Book, seoData: SEOData): Promise<Marketing> {
    if (!this.geminiConfig) throw new Error("Gemini config required for copywriting.");
    
    console.log("[ProfessionalAssets] ✍️ Generating Master Copywriting...");
    
    const prompt = `Crea copywriting profesional para este ebook:

Título: ${book.title}
Categoría: ${book.category}
Keywords principales: ${seoData.keywords.join(', ')}
Público objetivo: ${book.targetAudience}

Genera un JSON con:
1. "shortDescription": (160 caracteres) - Para Amazon/Google
2. "longDescription": (2000 caracteres) - Página de ventas
3. "bulletPoints": [5 beneficios clave]
4. "cta": Call-to-action persuasivo
5. "authorBio": Biografía del autor sugerida
6. "hiddenKeywords": Keywords ocultas para SEO`;

    const response = await generateTextCore(prompt, "Eres un copywriter senior experto en lanzamientos de ebooks.", this.geminiConfig);
    
    try {
        let clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
    } catch (e) {
        return { raw: response };
    }
  }

  async generateMetadata(book: Book, seo: SEOData): Promise<MultiPlatformMetadata> {
    console.log("[ProfessionalAssets] 📋 Generating Multi-Platform Metadata...");
    
    return {
      amazon_kdp: {
        title: book.title,
        subtitle: seo.subtitle || "Expert Guide",
        description: seo.longDescription,
        keywords: seo.keywords.slice(0, 7), 
        categories: ["Non-fiction", book.category],
        language: book.language,
        publicationDate: new Date().toISOString()
      },
      apple_books: {
        title: book.title,
        publisher: "Nexbook AI",
        category: book.category
      },
      google_play: {
        title: book.title,
        price: "9.99",
        currency: "USD"
      }
    };
  }

  // Helper method for the OracleMaster flow
  async createAllAssets(book: Book, seo: SEOData): Promise<any> {
      const covers = await this.generateCovers(book);
      const mainCover = covers.amazon_kdp;
      const mockups = await this.generateMockups(mainCover);
      const copywriting = await this.generateCopywriting(book, seo);
      const metadata = await this.generateMetadata(book, seo);

      return { covers, mockups, copywriting, metadata };
  }

  async generateChapterImages(chapter: any): Promise<any[]> {
      const result = await this.imageEngine.generateChapterImages({
          title: chapter.title,
          content: chapter.content || chapter.description || ""
      });
      return result;
  }
}
