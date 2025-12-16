const fs = require('fs');
const API_KEY = 'AIzaSyBp1GFnXdqavZt8mKcp8zf_ktz_N4FYhGk';

let output = '';
function log(msg) {
    output += msg + '\n';
    console.log(msg);
}

async function test() {
    log('=== GEMINI API TEST ===');
    log('API Key: ' + API_KEY.substring(0, 15) + '...');
    log('');
    
    // List models
    log('Step 1: Listing all available models...');
    try {
        const listRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + API_KEY);
        const listData = await listRes.json();
        
        if (listData.error) {
            log('ERROR: ' + listData.error.code + ' - ' + listData.error.message);
        } else if (listData.models) {
            log('Found ' + listData.models.length + ' models');
            listData.models.forEach(m => {
                if (m.name.includes('flash') || m.name.includes('image')) {
                    log('  * ' + m.name);
                }
            });
        }
    } catch (e) {
        log('Network Error: ' + e.message);
    }
    
    log('');
    log('Step 2: Testing gemini-2.5-flash-image...');
    try {
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' + API_KEY;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Draw a red circle' }] }]
            })
        });
        
        log('Status: ' + res.status);
        const data = await res.json();
        
        if (data.error) {
            log('ERROR CODE: ' + data.error.code);
            log('ERROR MSG: ' + data.error.message);
        } else if (data.candidates) {
            log('SUCCESS! Got candidates');
            const parts = data.candidates[0]?.content?.parts || [];
            parts.forEach((p, i) => {
                if (p.text) log('Part ' + i + ': TEXT');
                if (p.inlineData) log('Part ' + i + ': IMAGE (' + p.inlineData.mimeType + ')');
            });
        }
    } catch (e) {
        log('Network Error: ' + e.message);
    }
    
    log('');
    log('=== TEST COMPLETE ===');
    
    fs.writeFileSync('gemini-test-result.txt', output, 'utf8');
    log('Results saved to gemini-test-result.txt');
}

test();
