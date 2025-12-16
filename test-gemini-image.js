require('dotenv').config();

const apiKey = process.env.GOOGLE_API_KEY;
console.log('Testing GOOGLE_API_KEY:', apiKey ? apiKey.substring(0, 15) + '...' : 'NOT FOUND');

if (!apiKey) {
    console.log('❌ No GOOGLE_API_KEY found in .env');
    process.exit(1);
}

async function test() {
    console.log('\n🍌 Testing gemini-2.5-flash-image (Nano Banana)...\n');
    
    try {
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
            {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    contents: [{ 
                        parts: [{ text: 'Generate a simple image of a red apple on white background' }] 
                    }]
                })
            }
        );

        console.log('Status:', response.status);
        
        const data = await response.json();
        
        if (data.error) {
            console.log('\n❌ ERROR:');
            console.log('Code:', data.error.code);
            console.log('Message:', data.error.message);
        } else if (data.candidates) {
            console.log('\n✅ SUCCESS! Response received.');
            const parts = data.candidates[0]?.content?.parts || [];
            for (const part of parts) {
                if (part.text) {
                    console.log('Text:', part.text.substring(0, 100));
                }
                if (part.inlineData) {
                    console.log('🖼️ IMAGE RECEIVED!');
                    console.log('   MimeType:', part.inlineData.mimeType);
                    console.log('   Data length:', part.inlineData.data?.length, 'bytes');
                }
            }
            if (parts.length === 0) {
                console.log('⚠️ No parts in response');
            }
        } else {
            console.log('\n⚠️ Unexpected response:');
            console.log(JSON.stringify(data).substring(0, 500));
        }
    } catch (e) {
        console.log('\n❌ Network Error:', e.message);
    }
}

test();
