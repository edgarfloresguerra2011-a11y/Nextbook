const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
    const TARGET_ID = 'cmj7d0xgn00015ax0jqgqe4wa';
    console.log(`Checking Book: ${TARGET_ID}`);
    
    // Try to find the specific book from screenshot, or fall back to most recent
    let book = await prisma.book.findUnique({ where: { id: TARGET_ID } });
    
    if (!book) {
        console.log(`Target ID ${TARGET_ID} not found. Using most recent book instead.`);
        book = await prisma.book.findFirst({ orderBy: { updatedAt: 'desc' } });
    }
    
    if (!book) { console.log('No books found in DB.'); return; }
    
    console.log(`Targeting Book: "${book.title}" (${book.id})`);
    console.log(`Current Cover Start: ${book.coverImageUrl ? book.coverImageUrl.substring(0,50) : 'NULL'}`);
    
    // Force Update to Base64 from latest local file
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir).sort();
        if (files.length > 0) {
            // Get the newest png file
            const newest = files.filter(f => f.endsWith('.png')).pop();
            if (newest) {
                const buffer = fs.readFileSync(path.join(uploadDir, newest));
                const base64 = `data:image/png;base64,${buffer.toString('base64')}`;
                
                console.log(`Forcing update to Base64 from ${newest} (len: ${base64.length})`);
                
                await prisma.book.update({
                    where: { id: book.id },
                    data: { coverImageUrl: base64 }
                });
                console.log('✅ UPDATED BOOK WITH BASE64 IMAGE!');
            } else {
                console.log('No PNG files in uploads.');
            }
        }
    } else {
        console.log('Uploads dir missing.');
    }
}

main().finally(() => prisma.$disconnect());
