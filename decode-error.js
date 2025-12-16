const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const book = await prisma.book.findFirst({ orderBy: { updatedAt: 'desc' }, select: { coverImageUrl: true } });
    if (!book || !book.coverImageUrl) { console.log('No image'); return; }
    
    console.log('Reading Image Data...');
    // Remove prefix
    const base64 = book.coverImageUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Try to decode as text to see if it's a JSON response trapped in Base64
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    
    console.log('--- DECODED CONTENT START ---');
    console.log(decoded.substring(0, 2000)); 
    console.log('--- DECODED CONTENT END ---');
}

main().finally(() => prisma.$disconnect());
