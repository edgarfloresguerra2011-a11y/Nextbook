
const { getGoogleAccessToken } = require('./lib/vertex-auth');
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ebboka-53259604-4480e';

async function diagnose() {
    console.log("--- DIAGNOSTICO VERTEX AI ---");
    console.log(`Proyecto ID: ${projectId}`);
    
    const token = await getGoogleAccessToken();
    if (!token) { console.log("ERROR: No se pudo obtener token."); return; }
    
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`;
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ instances: [{ prompt: "test" }], parameters: { sampleCount: 1 } })
        });
        
        if (res.ok) {
            console.log("✅ EXITOSO: La API respondió correctamente.");
        } else {
            const txt = await res.text();
            console.log(`❌ ERROR ${res.status}:`);
            try {
                const json = JSON.parse(txt);
                console.log("MENSAJE:", json.error.message);
                console.log("ESTADO:", json.error.status);
            } catch {
                console.log(txt);
            }
        }
    } catch (e) {
        console.log("EXCEPCION:", e.message);
    }
}
diagnose();
