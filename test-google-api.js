// Test script to verify Google API key works
require('dotenv').config();

async function testGoogleAPI() {
    const apiKey = process.env.GOOGLE_API_KEY;
    
    console.log('=== GOOGLE API KEY TEST ===');
    console.log('Key found:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'NO KEY FOUND!');
    console.log('');

    if (!apiKey) {
        console.log('❌ No GOOGLE_API_KEY in .env file');
        return;
    }

    // Test 1: List available models
    console.log('📋 Test 1: Listing available models...');
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await res.json();
        
        if (data.error) {
            console.log('❌ Error:', data.error.message);
        } else if (data.models) {
            console.log('✅ Models available:');
            data.models.slice(0, 10).forEach(m => {
                console.log(`   - ${m.name}`);
            });
            console.log(`   ... and ${data.models.length - 10} more`);
        }
    } catch (e) {
        console.log('❌ Network error:', e.message);
    }

    console.log('');

    // Test 2: Simple text generation (to verify key works)
    console.log('📝 Test 2: Simple text generation...');
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Say hello in one word" }] }]
                })
            }
        );
        const data = await res.json();
        
        if (data.error) {
            console.log('❌ Error:', data.error.code, '-', data.error.message.substring(0, 100));
        } else if (data.candidates) {
            const text = data.candidates[0]?.content?.parts?.[0]?.text;
            console.log('✅ Response:', text);
        }
    } catch (e) {
        console.log('❌ Network error:', e.message);
    }

    console.log('');

    // Test 3: Image generation with correct model
    console.log('🖼️ Test 3: Image generation with Gemini 2.0 Flash...');
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ 
                        parts: [{ text: "Generate an image of a red apple on a white background" }] 
                    }],
                    generationConfig: {
                        responseModalities: ["IMAGE", "TEXT"]
                    }
                })
            }
        );
        
        console.log('   Status:', res.status);
        const data = await res.json();
        
        if (data.error) {
            console.log('❌ Error:', data.error.code, '-', data.error.message.substring(0, 150));
        } else if (data.candidates) {
            const parts = data.candidates[0]?.content?.parts || [];
            let foundImage = false;
            for (const part of parts) {
                if (part.inlineData) {
                    console.log('✅ IMAGE RECEIVED! MimeType:', part.inlineData.mimeType);
                    console.log('   Data length:', part.inlineData.data?.length || 0, 'bytes');
                    foundImage = true;
                }
                if (part.text) {
                    console.log('   Text response:', part.text.substring(0, 100));
                }
            }
            if (!foundImage) {
                console.log('⚠️ Response received but no image data. Parts:', JSON.stringify(parts).substring(0, 200));
            }
        }
    } catch (e) {
        console.log('❌ Network error:', e.message);
    }

    console.log('');
    console.log('=== TEST COMPLETE ===');
}

testGoogleAPI();
