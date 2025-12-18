
const { getGoogleAccessToken } = require('./lib/vertex-auth');
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ebboka-53259604-4480e';

async function testParams() {
    console.log(`Testing Vertex AI Params...`);
    const token = await getGoogleAccessToken();
    if (!token) return;

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`;
    const prompt = "A book cover";

    const configs = [
        { name: "Ratio 2:3", params: { sampleCount: 1, aspectRatio: "2:3" } },
        { name: "Ratio 3:4", params: { sampleCount: 1, aspectRatio: "3:4" } },
        { name: "Ratio 9:16", params: { sampleCount: 1, aspectRatio: "9:16" } },
        { name: "No Ratio (Default)", params: { sampleCount: 1 } },
    ];

    for (const conf of configs) {
        console.log(`\n--- Testing ${conf.name} ---`);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    instances: [{ prompt }],
                    parameters: conf.params
                })
            });

            if (res.ok) {
                console.log("✅ SUCCESS");
            } else {
                const txt = await res.text();
                // Extract useful error info
                console.log(`❌ FAILED (${res.status}): ${txt.substring(0, 150)}...`);
            }
        } catch (e) {
            console.log("Exception:", e.message);
        }
    }
}

testParams();
