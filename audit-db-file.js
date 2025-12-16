const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    let out = '=== SYSTEM AUDIT ===\n';
    const log = (msg) => out += msg + '\n';
    
    // Users
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    log(`Found ${users.length} Users:`);
    users.forEach(u => log(` - ${u.email} (${u.id})`));
    
    // Books
    const books = await prisma.book.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, userId: true, coverImageUrl: true }
    });
    
    log(`\nLast 5 Books:`);
    books.forEach(b => {
        let status = "NULL";
        if (b.coverImageUrl) {
            if (b.coverImageUrl.startsWith('data:')) status = `BASE64 (${b.coverImageUrl.length} chars)`;
            else status = b.coverImageUrl.substring(0, 100);
        }
        log(` - [${b.id}] "${b.title}" (User: ${b.userId})`);
        log(`   Cover: ${status}`);
    });
    
    fs.writeFileSync('audit_result.txt', out);
}

main().finally(() => prisma.$disconnect());
