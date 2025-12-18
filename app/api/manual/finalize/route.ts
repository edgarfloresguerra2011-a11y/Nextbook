
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { OracleMaster } from '@/lib/agents/oracle-master';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { bookId, budget = 'standard' } = await req.json();

        const book = await prisma.book.findUnique({
            where: { id: bookId, userId: session.user.id },
            include: { chapters: true }
        });

        if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

        const configs = await prisma.providerConfig.findMany({
            where: { userId: session.user.id, isActive: true }
        });

        const oracle = new OracleMaster(configs);
        
        // Generate Professional Assets
        const assets = await oracle.generateProfessionalAssets(book, (book as any).category, budget);

        // Finalize Book status
        await (prisma.book as any).update({
            where: { id: bookId },
            data: {
                status: 'completed',
                covers: assets.covers as any,
                mockups: assets.mockups as any,
                copywriting: assets.copywriting as any,
                platformMetadata: assets.metadata as any
            }
        });

        return NextResponse.json({
            success: true,
            assets,
            message: "Ebook finalized successfully"
        });

    } catch (error) {
        console.error('[Manual v2] Finalize Error:', error);
        return NextResponse.json({ error: 'Failed to finalize book' }, { status: 500 });
    }
}
