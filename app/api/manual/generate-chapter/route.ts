
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { OracleMaster } from '@/lib/agents/oracle-master';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { bookId, chapterNumber, budget = 'standard', customPrompt, imageProvider } = await req.json();

        const book = await prisma.book.findUnique({
            where: { id: bookId, userId: session.user.id },
            include: { chapters: true }
        });

        if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

        const chapter = book.chapters.find((c: any) => c.number === chapterNumber);
        if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

        const configs = await prisma.providerConfig.findMany({
            where: { userId: session.user.id, isActive: true }
        });

        const oracle = new OracleMaster(configs);
        
        // Use custom prompt if provided, otherwise the chapter title
        const generationPrompt = customPrompt || `Escribe el contenido completo para el capítulo "${chapter.title}" del libro "${book.title}". Debe ser informativo y profesional.`;

        const result = await oracle.processSingleChapter(
            { title: chapter.title, description: generationPrompt },
            book.title,
            budget
        );

        // Update Chapter in DB
        await (prisma.chapter as any).update({
            where: { id: chapter.id },
            data: {
                content: result.content,
                images: result.images as any,
                imageProvider: result.provider,
                correctedContent: result.content, // Assuming refined in this step
                humanized: true
            }
        });

        return NextResponse.json({
            success: true,
            chapter: {
                number: chapterNumber,
                title: chapter.title,
                content: result.content,
                images: result.images
            }
        });

    } catch (error) {
        console.error('[Manual v2] Chapter Gen Error:', error);
        return NextResponse.json({ error: 'Failed to generate chapter' }, { status: 500 });
    }
}
