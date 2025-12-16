
const fetch = require('node-fetch');

async function testApi() {
    console.log("Testing API...");
    try {
        const res = await fetch('http://localhost:3000/api/books/cmj7h8dol00055ah8odfvnjap/regenerate-cover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'test' })
        });
        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`Body: ${text}`);
    } catch (e) {
        console.error("Error:", e);
    }
}
testApi();
