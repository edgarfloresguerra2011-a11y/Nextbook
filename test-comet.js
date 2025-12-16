const API_KEY = 'sk-g7Ow0XIFG9I75T2WayJdeTqEqdb5Q76XHQ8cHxwS8oRiL8P7';

async function test() {
    console.log('=== COMETAPI TEST ===\n');
    
    // Test 1: OpenAI-compatible endpoint
    console.log('Test 1: api.cometapi.com/v1/images/generations');
    try {
        const res1 = await fetch('https://api.cometapi.com/v1/images/generations', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: 'A red apple',
                n: 1,
                size: '1024x1024'
            })
        });
        console.log('Status:', res1.status);
        const data1 = await res1.text();
        console.log('Response:', data1.substring(0, 300));
    } catch (e) {
        console.log('Error:', e.message);
    }

    console.log('\n---');

    // Test 2: Alternative base URL 
    console.log('Test 2: api.cometapi.com/openai/v1/images/generations');
    try {
        const res2 = await fetch('https://api.cometapi.com/openai/v1/images/generations', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: 'A red apple',
                n: 1,
                size: '1024x1024'
            })
        });
        console.log('Status:', res2.status);
        const data2 = await res2.text();
        console.log('Response:', data2.substring(0, 300));
    } catch (e) {
        console.log('Error:', e.message);
    }

    console.log('\n---');

    // Test 3: With custom headers
    console.log('Test 3: With x-api-key header');
    try {
        const res3 = await fetch('https://api.cometapi.com/v1/images/generations', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: 'A red apple',
                n: 1,
                size: '1024x1024'
            })
        });
        console.log('Status:', res3.status);
        const data3 = await res3.text();
        console.log('Response:', data3.substring(0, 300));
    } catch (e) {
        console.log('Error:', e.message);
    }
}

test();
