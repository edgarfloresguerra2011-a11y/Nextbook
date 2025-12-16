const fs = require('fs');
const API_KEY = 'AIzaSyBp1GFnXdqavZt8mKcp8zf_ktz_N4FYhGk';

async function test() {
    console.log('=== GEMINI 3 PRO IMAGE TEST ===\n');
    
    // Model: gemini-3-pro-image-preview (Nano Banana Pro)
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=' + API_KEY;
    
    console.log('Testing model: gemini-3-pro-image-preview');
    console.log('URL:', url.replace(API_KEY, 'API_KEY'));
    console.log('');
    
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: 'Generate a simple image of a red apple' }] }]
        })
    });
    
    console.log('Status:', res.status);
    const data = await res.json();
    
    if (data.error) {
        console.log('ERROR CODE:', data.error.code);
        console.log('ERROR MESSAGE:', data.error.message);
    } else if (data.candidates) {
        console.log('SUCCESS!');
        const parts = data.candidates[0]?.content?.parts || [];
        parts.forEach((p, i) => {
            if (p.text) console.log('Part', i, ': TEXT');
            if (p.inlineData) {
                console.log('Part', i, ': IMAGE');
                console.log('  MimeType:', p.inlineData.mimeType);
                console.log('  Data size:', p.inlineData.data?.length, 'chars');
            }
        });
    } else {
        console.log('Unexpected response:', JSON.stringify(data).substring(0, 500));
    }
}

test();
