const fs = require('fs');
const API_KEY = 'sk-g7Ow0XIFG9I75T2WayJdeTqEqdb5Q76XHQ8cHxwS8oRiL8P7';

async function test() {
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };
    
    log('=== COMETAPI TEST ===');
    
    try {
        const res = await fetch('https://api.cometapi.com/v1/images/generations', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: 'A simple red apple on white background',
                n: 1,
                size: '1024x1024'
            })
        });
        
        log('Status: ' + res.status);
        const data = await res.json();
        log('Response: ' + JSON.stringify(data, null, 2));
        
        if (data.data && data.data[0] && data.data[0].url) {
            log('SUCCESS! Image URL: ' + data.data[0].url.substring(0, 100) + '...');
        }
    } catch (e) {
        log('Error: ' + e.message);
    }
    
    fs.writeFileSync('comet-result.txt', output, 'utf8');
}

test();
