// Direct test - no dependencies except fetch
const API_KEY = 'AIzaSyBp1GFnXdqavZt8mKcp8zf_ktz_N4FYhGk';

async function test() {
    console.log('🧪 Testing Gemini API directly...\n');
    
    // First, list available models to see what's accessible
    console.log('📋 Step 1: Listing models...');
    try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const listData = await listRes.json();
        
        if (listData.error) {
            console.log('❌ List models error:', listData.error.code, listData.error.message);
            return;
        }
        
        console.log('✅ Models available:');
        const imageModels = listData.models?.filter(m => 
            m.name.includes('image') || m.supportedGenerationMethods?.includes('generateContent')
        ) || [];
        
        imageModels.slice(0, 15).forEach(m => {
            console.log(`   - ${m.name}`);
        });
        
        // Find image-capable model
        const imageModel = listData.models?.find(m => m.name.includes('flash-image'));
        if (imageModel) {
            console.log(`\n🎯 Found image model: ${imageModel.name}`);
        }
        
    } catch (e) {
        console.log('❌ Network error:', e.message);
        return;
    }
    
    // Now test image generation
    console.log('\n🖼️ Step 2: Testing image generation...');
    try {
        const genRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'A simple red circle on white background' }] }]
                })
            }
        );
        
        console.log('Response status:', genRes.status);
        const genData = await genRes.json();
        
        if (genData.error) {
            console.log('❌ Generation error:');
            console.log('   Code:', genData.error.code);
            console.log('   Message:', genData.error.message.substring(0, 200));
        } else {
            console.log('✅ Response received!');
            const parts = genData.candidates?.[0]?.content?.parts || [];
            parts.forEach((p, i) => {
                if (p.text) console.log(`   Part ${i}: TEXT - ${p.text.substring(0, 50)}`);
                if (p.inlineData) console.log(`   Part ${i}: IMAGE - ${p.inlineData.mimeType}, ${p.inlineData.data?.length} bytes`);
            });
        }
    } catch (e) {
        console.log('❌ Network error:', e.message);
    }
}

test();
