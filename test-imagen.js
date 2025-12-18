const https = require('https');
const apiKey = process.env.GOOGLE_API_KEY || "AIzaSyCVzcazffHHKArujdQSDXDlCUbK_3dIJtM";

const endpoints = [
    { name: 'Imagen 3', path: '/v1beta/models/imagen-3.0-generate-001:predict' },
    { name: 'Imagen 2 (Old)', path: '/v1beta/models/image-generation-001:predict' },
    { name: 'Gemini Pro', path: '/v1beta/models/gemini-pro:generateContent' } // Control
];

console.log("Testing with key ending in: ..." + apiKey.slice(-4));

endpoints.forEach(ep => {
    const data = JSON.stringify(
        ep.name.includes('Gemini') 
        ? { contents: [{ parts: [{ text: "Hello" }] }] }
        : { instances: [{ prompt: "Test" }], parameters: { sampleCount: 1 } }
    );

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: ep.path + '?key=' + apiKey,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            console.log(`[${ep.name}] Status: ${res.statusCode}`);
            if (res.statusCode !== 200) {
                console.log(`Error: ${body.substring(0, 100)}...`);
            } else {
                console.log("SUCCESS!");
            }
        });
    });

    req.on('error', error => console.error(`[${ep.name}] Failed:`, error));
    req.write(data);
    req.end();
});
