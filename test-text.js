const fs = require('fs');
const API_KEY = 'AIzaSyBp1GFnXdqavZt8mKcp8zf_ktz_N4FYhGk';

async function test() {
    console.log('Testing with gemini-1.5-flash (TEXT only, to verify key works)...');
    
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + API_KEY;
    
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "Hello" in Spanish' }] }]
        })
    });
    
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2).substring(0, 1000));
}

test();
