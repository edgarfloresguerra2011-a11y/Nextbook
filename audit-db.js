const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== SYSTEM AUDIT ===');
    
    // 1. Users
    const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
    console.log(`\nFound ${users.length} Users:`);
    users.forEach(u => console.log(` - [${u.id}] ${u.email} (${u.name})`));
    
    // 2. Books
    const books = await prisma.book.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, userId: true, coverImageUrl: true }
    });
    
    console.log(`\nLast 5 Books:`);
    books.forEach(b => {
        let coverStatus = "NULL";
        if (b.coverImageUrl) {
            if (b.coverImageUrl.startsWith('data:')) coverStatus = `BASE64 (${b.coverImageUrl.length} chars)`;
            else if (b.coverImageUrl.startsWith('/')) coverStatus = `PATH: ${b.coverImageUrl}`;
            else coverStatus = `URL: ${b.coverImageUrl}`;
        }
        console.log(` - [${b.id}] "${b.title}" (Owner: ${b.userId})`);
        console.log(`   Cover: ${coverStatus}`);
    });
}

main().finally(() => prisma.$disconnect());
