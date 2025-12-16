
const fetch = require('node-fetch');

async function testApi() {
    console.log("Testing TEST API...");
    try {
        const res = await fetch('http://localhost:3000/api/test-route/12345', {
            method: 'POST',
            body: "{}"
        });
        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`Body: ${text}`);
    } catch (e) {
        console.error("Error:", e);
    }
}
testApi();
