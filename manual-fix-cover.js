const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ACCOUNT_ID = "4bb1e6dc1ba8e74870a7faf7bd72bff3";
const API_TOKEN = "X-4Un25GrctYdC7nweT9ZG_pgfKLIrSC0yrotWQ8";
const MODEL_ID = "@cf/black-forest-labs/flux-1-schnell";

async function main() {
    console.log('--- MANUAL COVER GENERATION ---');
    
    const books = await prisma.book.findMany({ 
        orderBy: { updatedAt: 'desc' },
        take: 1 
    });
    
    if (books.length === 0) { console.log('No books found'); return; }
    
    const book = books[0];
    console.log(`Target Book: "${book.title}" (ID: ${book.id})`);
    
    console.log('Requesting image from Cloudflare...');
    const prompt = `Cinematic book cover for "${book.title}". ${book.genre}. ${book.description ? book.description.substring(0,200) : ''}`;
    
    try {
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL_ID}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt, num_steps: 4 })
        });

        if (!response.ok) {
            console.log('Error:', await response.text());
            return;
        }

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:image/png;base64,${base64}`;
        
        console.log(`Image generated! Size: ${dataUrl.length} chars`);
        
        await prisma.book.update({
            where: { id: book.id },
            data: { coverImageUrl: dataUrl }
        });
        
        console.log('✅ DATABASE UPDATED!');
        
    } catch (e) {
        console.error('Exception:', e);
    }
}

main().finally(() => prisma.$disconnect());
