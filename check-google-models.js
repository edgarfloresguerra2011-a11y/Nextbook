require('dotenv').config({ path: '.env' });

async function listModels() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.log("No GOOGLE_API_KEY found in .env");
    return;
  }
  console.log("Checking models using key: " + apiKey.substring(0, 10) + "...");

  try {
      // Direct fetch to list models to avoid SDK version issues
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await res.json();
      
      if (data.models) {
          console.log("\n✅ Available Models:");
          data.models.forEach(m => {
              if (m.name.includes('image') || m.name.includes('gen') || m.name.includes('veo')) {
                   console.log(`MODEL: ${m.name}`);
                   console.log(`METHODS: ${m.supportedGenerationMethods.join(', ')}`);
                   console.log('---');
              }
          });
      } else {
          console.log("❌ No models found or error:", data);
      }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
