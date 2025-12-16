const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
    console.log('--- SWITCHING TO BASE64 STORAGE ---');
    
    // 1. Find the generated file on disk
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const files = fs.readdirSync(uploadDir).sort();
    if (files.length === 0) { console.log('No files found'); return; }
    
    const newestFile = files[files.length - 1];
    const filePath = path.join(uploadDir, newestFile);
    console.log(`Reading file: ${newestFile}`);
    
    // 2. Convert to Base64
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    
    console.log(`Converted to Base64 (len: ${dataUrl.length})`);
    
    // 3. Update DB with Base64
    const book = await prisma.book.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (book) {
        await prisma.book.update({
            where: { id: book.id },
            data: { coverImageUrl: dataUrl }
        });
        console.log('✅ Updated DB with Base64 Data URL');
    }
}

main().finally(() => prisma.$disconnect());
