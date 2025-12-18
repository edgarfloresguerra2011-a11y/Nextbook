
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { OracleMaster } from '@/lib/agents/oracle-master';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { topic, chapters = 10, budget = 'standard' } = await req.json();

        const configs = await prisma.providerConfig.findMany({
            where: { userId: session.user.id, isActive: true }
        });

        const oracle = new OracleMaster(configs);
        const { projectConfig, research, plan } = await oracle.performInitialResearch({
            topic,
            chapters,
            budget,
            platforms: []
        });

        // Create a Draft Book
        const book = await prisma.book.create({
            data: {
                userId: session.user.id,
                title: plan.title,
                category: projectConfig.classification.category || 'General',
                description: plan.metadata?.description || '',
                generationMode: 'manual',
                status: 'planning',
                researchData: { research, projectConfig } as any,
                seoData: plan.keywords as any,
                chapters: {
                    create: plan.chapters.map((ch: any, idx: number) => ({
                        number: idx + 1,
                        title: ch.title,
                        content: '',
                        images: [] as any
                    }))
                }
            } as any
        });

        return NextResponse.json({
            success: true,
            bookId: book.id,
            plan: {
                title: plan.title,
                chapters: plan.chapters,
                category: projectConfig.classification.category,
                budget
            }
        });

    } catch (error) {
        console.error('[Manual v2] Plan Error:', error);
        return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
    }
}
