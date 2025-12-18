
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { OracleMaster } from '@/lib/agents/oracle-master';

export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
    const startTime = Date.now();
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { topic, chapters = 10, budget = 'standard', platforms = ['amazon'] } = body;

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        // 1. Log Start
        console.log(`[Autopilot v2] Starting sequence for: ${topic} (${chapters} chapters, ${budget} budget)`);

        // 2. Fetch all active AI configurations for this user
        const configs = await prisma.providerConfig.findMany({
            where: { userId: (session.user as any).id, isActive: true }
        });

        // 3. Initialize Oracle Master
        const oracle = new OracleMaster(configs);

        // 4. Execute Full Autopilot Pipeline (Phases 1-4)
        // This includes Research, Planning, Parallel Generation, Quality Pipeline, and Professional Assets
        const ebook = await oracle.executeAutopilot({
            topic,
            chapters,
            budget,
            platforms
        });

        // 5. Measure Performance
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);

        // 6. Save to Database
        const book = await prisma.book.create({
            data: {
                userId: (session.user as any).id,
                title: ebook.title,
                category: ebook.metadata.category || 'General',
                description: ebook.metadata.description || '',
                generationMode: 'autopilot',
                status: 'completed',
                textProvider: 'deepseek',
                imageProvider: (ebook.metadata.category.toLowerCase().includes('food')) ? 'banana_pro' : 'dalle3',
                covers: ebook.assets.covers as any,
                mockups: ebook.assets.mockups as any,
                copywriting: ebook.assets.copywriting as any,
                platformMetadata: ebook.assets.metadata as any,
                researchData: ebook.metadata as any,
                generationTime: durationSeconds,
                estimatedCost: budget === 'premium' ? 12.50 : 3.20, // Theoretical calculation
                seoData: (ebook as any).keywords || ebook.metadata.keywords || {},
                chapters: {
                    create: ebook.chapters.map((ch: any, idx: number) => ({
                        number: idx + 1,
                        title: ch.title,
                        content: ch.content,
                        images: ch.images as any,
                        imageProvider: (ebook.metadata.category.toLowerCase().includes('food')) ? 'banana_pro' : 'dalle3'
                    }))
                }
            } as any // Bypass strict typing if prisma client hasn't fully updated in the env
        });

        // 7. Return structured result as per Step 9
        return NextResponse.json({
            success: true,
            bookId: book.id,
            metrics: {
                totalTime: `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`,
                cost: `$${(book as any).estimatedCost || 0}`,
                efficiency: 'Parallel Execution Tier 1'
            },
            data: {
                title: book.title,
                chaptersCount: ebook.chapters.length,
                assets: {
                    covers: ebook.assets.covers,
                    mockups: ebook.assets.mockups,
                    copywriting: ebook.assets.copywriting
                },
                metadata: ebook.assets.metadata,
                publicationGuide: "https://nexbook.ai/guides/self-publishing-masterclass"
            }
        });

    } catch (error) {
        console.error('[Autopilot v2] Fatal Error:', error);
        return NextResponse.json({ 
            error: 'Autopilot generation failed', 
            details: error instanceof Error ? error.message : String(error) 
        }, { status: 500 });
    }
}
