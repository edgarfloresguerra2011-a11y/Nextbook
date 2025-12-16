const fs = require('fs');

const ACCOUNT_ID = "4bb1e6dc1ba8e74870a7faf7bd72bff3";
const API_TOKEN = "X-4Un25GrctYdC7nweT9ZG_pgfKLIrSC0yrotWQ8";
// Using FLUX model as configured in the app
const MODEL_ID = "@cf/black-forest-labs/flux-1-schnell";

async function testCloudflare() {
    console.log('=== CLOUDFLARE WORKERS AI TEST ===');
    console.log(`Account ID: ${ACCOUNT_ID}`);
    console.log(`Model: ${MODEL_ID}`);
    
    try {
        const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL_ID}`;
        
        console.log(`Making request to: ${url}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: "A futuristic city with flying cars, cyberpunk style, high resolution",
                num_steps: 4 // low steps for speed, typical for schnell models
            })
        });

        console.log(`Status Code: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            return;
        }

        // The response is binary image data
        const buffer = await response.arrayBuffer();
        console.log(`✅ Success! Received image data: ${buffer.byteLength} bytes`);
        
        // Save to verify it's a real image
        fs.writeFileSync('test-cf-result.png', Buffer.from(buffer));
        console.log('Image saved to test-cf-result.png');

    } catch (error) {
        console.error('❌ Exception:', error.message);
    }
}

testCloudflare();
