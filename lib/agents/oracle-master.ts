import { prisma } from '@/lib/db'; 
import { AIConfig, generateWithFallback } from '../ai-core';
import { consultOracle, ProjectConfig, buildPriorityStack } from './oracle';
import { GeminiCore } from './gemini-core';
import { TextEngine } from '../generators/text-engine';
import { QualityEnhancer } from '../pipeline/quality-enhancer';
import { ProfessionalAssets, Book, SEOData } from '../assets/professional-generator';

export interface Task {
    type: 'food_photography' | 'abstract_art' | 'text_fast' | 'text_quality' | 'grammar' | 'correction' | 'humanization';
    context?: any;
}

export type Provider = 'banana_pro' | 'dalle3' | 'deepseek' | 'openai' | 'gemini' | string;

export interface ManualConfig {
    topic: string;
    chapters: number;
    budget: 'premium' | 'standard' | 'economy';
    imageStyle?: string;
    platforms: string[];
}

export interface ProfessionalEbook {
    title: string;
    metadata: any;
    chapters: any[];
    assets: {
        covers: any;
        mockups: any[];
        copywriting: any;
        metadata: any;
        assembly: any;
    };
    distributionReady: boolean;
}

// --- ORACLE MASTER ---

export class OracleMaster {
  private geminiCore: GeminiCore;
  private textEngine: TextEngine;
  private qualityPipeline: QualityEnhancer;
  private assetGenerator: ProfessionalAssets;
  private allConfigs: AIConfig[];

  constructor(allConfigs: AIConfig[]) {
      this.allConfigs = allConfigs;
      this.geminiCore = new GeminiCore(allConfigs);
      this.textEngine = new TextEngine(allConfigs);
      this.qualityPipeline = new QualityEnhancer(allConfigs);
      this.assetGenerator = new ProfessionalAssets(allConfigs);
  }

  async executeAutopilot(userReq: ManualConfig): Promise<ProfessionalEbook> {
    console.log("🚀 Oracle Master: Engaging Autopilot...");

    // Phase 1: Research & Plan
    const { projectConfig, research, plan } = await this.performInitialResearch(userReq);

    // PHASE 2 & 3: Generation & Quality Enhancement
    const content = await this.generateAndEnhance(plan, userReq.budget);
    
    // PHASE 4: Professional Assets
    const assets = await this.generateProfessionalAssets(content, projectConfig.classification.category, userReq.budget);
    
    console.log("✅ Autopilot Sequence Completed.");
    return this.packageForDistribution(content, assets);
  }

  async executeManual(userInput: ManualConfig): Promise<ProfessionalEbook> {
     // The Manual engine follows the same logic but allows for UI-level pausing 
     // which is handled by the higher-level API routes.
     return this.executeAutopilot(userInput);
  }

  // --- Granular Methods for Manual/Interactive Workflow ---

  async performInitialResearch(userReq: ManualConfig) {
      const projectConfig = await consultOracle(userReq.topic, "Non-fiction", this.allConfigs, { 
          budget: userReq.budget, 
          chapters: userReq.chapters 
      });

      console.log("📊 Phase 1: Research...");
      const research = await this.geminiCore.analyzeMarketTrends(userReq.topic);
      const plan = await this.geminiCore.createContentPlan(research, userReq.chapters);
      
      return { projectConfig, research, plan };
  }

  async processSingleChapter(chapter: any, bookTitle: string, budget: 'premium' | 'standard' | 'economy' = 'standard') {
      console.log(`     [Interactive] Chapter: ${chapter.title}`);
      
      // 1. Text Generation (Respecting Budget/Tier)
      const raw = await this.textEngine.generate({
          title: chapter.title,
          prompt: `Escribe el contenido completo para el capítulo "${chapter.title}" del libro "${bookTitle}". Debe ser informativo y profesional.`,
      }, budget === 'premium' ? 'premium' : 'standard');

      // 2. Refinement
      const refinedContent = await this.qualityPipeline.process(raw);
      
      // 3. Images
      const imageResults = await this.assetGenerator.generateChapterImages({
          ...chapter,
          content: refinedContent
      });
      
      return {
          ...chapter,
          content: refinedContent,
          images: imageResults.map((img: any) => img.url),
          provider: imageResults[0]?.provider
      };
  }

  async generateProfessionalAssets(content: any, category: string, budget: string) {
      console.log("🎨 Phase 4: Professional Assets...");
      
      const bookData: Book = {
          title: content.title,
          category: category,
          targetAudience: content.metadata?.target || "General",
          language: budget === 'premium' ? 'en' : 'es',
          chapters: content.chapters
      };

      const seoData: SEOData = {
          keywords: content.keywords?.primary || [],
          subtitle: content.metadata?.description?.substring(0, 100),
          longDescription: content.metadata?.description
      };

      return await this.assetGenerator.createAllAssets(bookData, seoData);
  }

  private async generateAndEnhance(plan: any, budget: 'premium' | 'standard' | 'economy'): Promise<any> {
      console.log(`   - Parallelizing ${plan.chapters.length} chapters...`);
      
      const chapterPromises = plan.chapters.map(async (chapter: any) => {
          const result = await this.processSingleChapter(chapter, plan.title, budget);
          Object.assign(chapter, result);
          return chapter;
      });

      await Promise.all(chapterPromises);
      return plan;
  }

  private packageForDistribution(content: any, assets: any): ProfessionalEbook {
      // STEP 8: Final Assembly (Format bundling metadata)
      const assembly = {
          formats: ['EPUB', 'MOBI', 'PDF'],
          sourceImagesCount: content.chapters.reduce((acc: number, ch: any) => acc + (ch.images?.length || 0), 0),
          optimized: true,
          tocGenerated: true
      };

      return {
          title: content.title,
          metadata: content.metadata,
          chapters: content.chapters,
          assets: {
              ...assets,
              assembly
          },
          distributionReady: true
      };
  }
}
