
const { getGoogleAccessToken } = require('./lib/vertex-auth');
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ebboka-53259604-4480e';

async function testVertex() {
    console.log(`Testing Vertex AI for Project: ${projectId}`);
    const token = await getGoogleAccessToken();
    
    if (!token) {
        console.error("❌ Failed to get access token");
        return;
    }
    console.log("✅ OAuth Token acquired");

    const prompt = "A photorealistic image of a book cover";
    
    // Model to test
    const model = 'imagen-3.0-generate-001';
    
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${model}:predict`;
    
    console.log(`POST ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                instances: [{ prompt }],
                parameters: { sampleCount: 1, aspectRatio: "2:3" }
            })
        });

        if (response.ok) {
            console.log("✅ SUCCESS! Image generated.");
            const data = await response.json();
            // console.log(data);
        } else {
            console.error(`❌ FAILED: ${response.status}`);
            const text = await response.text();
            console.error("Response Body:", text);
        }

    } catch (error) {
        console.error("Exception:", error);
    }
}

testVertex();
