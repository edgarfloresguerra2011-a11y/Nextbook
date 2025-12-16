const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find the target book (using the known ID or latest)
    const TARGET_ID = 'cmj7d0xgn00015ax0jqgqe4wa';
    let book = await prisma.book.findUnique({ where: { id: TARGET_ID } });
    if (!book) book = await prisma.book.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!book || !book.coverImageUrl) return;

    console.log(`Fixing book: ${book.title}`);
    
    // 1. Get the current "corrupt" base64 (which wraps the JSON)
    const corruptBase64 = book.coverImageUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // 2. Decode it to string to get the JSON response
    const jsonString = Buffer.from(corruptBase64, 'base64').toString('utf8');
    
    console.log("Decoded string start:", jsonString.substring(0, 50));
    
    try {
        // 3. Parse JSON
        // Sometimes there might be garbage chars? usually not if it was full response.
        const json = JSON.parse(jsonString);
        
        if (json.result && json.result.image) {
            console.log("✅ Found inner image data!");
            const realBase64 = json.result.image;
            
            // 4. Determine mime type
            let mime = 'image/png';
            if (realBase64.startsWith('/9j/')) mime = 'image/jpeg';
            
            // 5. Update DB
            const validDataUrl = `data:${mime};base64,${realBase64}`;
            
            await prisma.book.update({
                where: { id: book.id },
                data: { coverImageUrl: validDataUrl }
            });
            console.log("✅ DATABASE UPDATED WITH VALID IMAGE.");
        } else {
            console.log("JSON does not contain result.image:", Object.keys(json));
        }
    } catch (e) {
        console.error("Error parsing JSON:", e.message);
    }
}

main().finally(() => prisma.$disconnect());
