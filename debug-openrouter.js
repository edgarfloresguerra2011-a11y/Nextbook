
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOpenRouter() {
  console.log("🔍 Iniciando diagnóstico de OpenRouter...");

  try {
    // 1. Buscar keys en DB
    const configs = await prisma.providerConfig.findMany({
      where: { isActive: true }
    });
    
    console.log(`📂 Encontrados ${configs.length} proveedores activos en la BD.`);
    
    const openRouterConfig = configs.find(c => c.provider === 'openrouter');
    
    if (!openRouterConfig) {
      console.error("❌ ERROR: No se encontró una configuración para 'openrouter' en la base de datos.");
      console.log("Proveedores encontrados:", configs.map(c => c.provider));
      return;
    }

    console.log("✅ Key de OpenRouter encontrada:", openRouterConfig.apiKey.substring(0, 8) + "...");

    // 2. Probar llamada a OpenRouter
    console.log("📡 Intentando conectar con OpenRouter API...");
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterConfig.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://localhost:3000",
        "X-Title": "Nexbook Debug"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.0-flash-exp:free", // Usando un modelo gratuito confiable
        "messages": [
          {"role": "user", "content": "Hello, are you working?"}
        ],
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ERROR API OpenRouter (${response.status}):`, errorText);
    } else {
      const data = await response.json();
      console.log("✅ ÉXITO: OpenRouter respondió correctamente.");
      console.log("📝 Respuesta:", data.choices[0].message.content);
    }

  } catch (e) {
    console.error("❌ Excepción fatal:", e);
  } finally {
    await prisma.$disconnect();
  }
}

testOpenRouter();
