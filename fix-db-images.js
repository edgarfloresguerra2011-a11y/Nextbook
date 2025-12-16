const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
    const dir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(dir)) { console.log('No uploads dir'); return; }
    
    // Get newest file
    const files = fs.readdirSync(dir)
        .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);
        
    if (files.length === 0) { console.log('No files'); return; }
    
    const newest = files[0].name;
    const newUrl = `/api/images/${newest}`;
    console.log(`Newest image: ${newest} -> URL: ${newUrl}`);
    
    // Update most recent book
    const book = await prisma.book.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (book) {
        console.log(`Updating book "${book.title}"`);
        await prisma.book.update({
            where: { id: book.id },
            data: { coverImageUrl: newUrl }
        });
        console.log('✅ Updated Book Cover URL');
    }
}

main().finally(() => prisma.$disconnect());
