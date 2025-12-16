const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const book = await prisma.book.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!book) return; 
    
    console.log(`Setting placeholder for: ${book.title}`);
    
    // Placeholder image (Unsplash)
    const placeholder = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80";
    
    await prisma.book.update({
        where: { id: book.id },
        data: { coverImageUrl: placeholder }
    });
    console.log("Updated to Unsplash URL.");
}
main().finally(() => prisma.$disconnect());
