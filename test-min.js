require('dotenv').config();

const apiKey = process.env.GOOGLE_API_KEY;
console.log('API Key:', apiKey ? apiKey.substring(0, 15) + '...' : 'NOT FOUND');

fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
})
.then(r => r.json())
.then(d => {
    if (d.error) {
        console.log('ERROR:', d.error.code, d.error.message);
    } else {
        console.log('SUCCESS! Text generation works.');
        console.log('Response:', d.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 50));
    }
})
.catch(e => console.log('NETWORK ERROR:', e.message));
