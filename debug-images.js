const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
    console.log('--- DEBUG IMAGES ---');

    // 1. Get the book
    const book = await prisma.book.findFirst({ 
        orderBy: { updatedAt: 'desc' }
    });
    
    if (!book) { console.log('No book found'); return; }
    
    console.log(`Book: ${book.title}`);
    console.log(`DB URL: ${book.coverImageUrl}`);
    
    // 2. Check File
    if (book.coverImageUrl && book.coverImageUrl.startsWith('/uploads')) {
        const relativePath = book.coverImageUrl.substring(1); // remove leading /
        const fullPath = path.join(process.cwd(), 'public', relativePath);
        
        console.log(`Checking file: ${fullPath}`);
        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            console.log(`✅ File EXISTS! Size: ${stats.size} bytes`);
        } else {
            console.log(`❌ File NOT FOUND at path!`);
            
            // List what IS there
            const dir = path.join(process.cwd(), 'public', 'uploads');
            if (fs.existsSync(dir)) {
                console.log('Files in public/uploads:', fs.readdirSync(dir));
            } else {
                console.log('public/uploads directory does not exist');
            }
        }
    } else {
        console.log('URL is not local /uploads');
    }
}

main().finally(() => prisma.$disconnect());
