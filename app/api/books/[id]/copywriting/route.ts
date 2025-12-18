import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Helper to generate text with AI
async function generateWithAI(prompt: string, config: any): Promise<string> {
  const { provider, apiKey, model } = config
  
  let targetModel = model || 'gpt-4o-mini'
  
  // Google Gemini
  if (provider === 'google') {
    targetModel = model || 'gemini-2.0-flash-exp'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
    })
    if (!response.ok) throw new Error(`Gemini Error: ${await response.text()}`)
    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  // OpenAI / Anthropic / Others
  let baseUrl = 'https://api.openai.com/v1'
  let headers: Record<string, string> = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  
  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!response.ok) throw new Error(`Claude Error`)
    const data = await response.json()
    return data.content?.[0]?.text || ''
  }

  if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1'
  else if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1'
  else if (provider === 'mistral') baseUrl = 'https://api.mistral.ai/v1'

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: targetModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 2000
    })
  })
  
  if (!response.ok) throw new Error(`API Error`)
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const s = session as any;
    if (!s?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = s.user.id
    const bookId = params.id

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { chapters: true }
    })

    if (!book || book.userId !== userId) {
      return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 })
    }

    // Get active AI provider for text generation
    const providers = await prisma.providerConfig.findMany({
      where: { userId, isActive: true },
      orderBy: { priority: 'asc' }
    })

    const textConfig = providers.find((p: any) => 
      ['google', 'openai', 'anthropic', 'openrouter', 'groq', 'mistral'].includes(p.provider)
    )

    if (!textConfig) {
      return NextResponse.json({ 
        error: 'No hay proveedores de IA configurados. Ve a Settings y configura al menos un proveedor.' 
      }, { status: 400 })
    }

    const wordCount = book.wordCount || 0
    const suggestedPrice = (wordCount * 0.003).toFixed(2)

    // === GENERAL COPYWRITING (LAUNCH KIT) ===
    const b = book as any; 
    const seoContext = `
    SEO CORE DATA:
    - Keywords Base: ${b.seoKeywords || 'Identificar las mejores'}
    - Meta Context: ${b.seoDescription || ''}
    `;

    const generalPrompt = `Eres un experto en marketing digital y lanzamientos de libros best-seller.

Genera un KIT DE LANZAMIENTO COMPLETO para este libro:
- Título: ${book.title}
- Género: ${book.genre}
- Descripción: ${book.description}
- Capítulos: ${book.chapters?.length || 0}
- Palabras: ${wordCount}
${seoContext}

Genera en formato JSON estricto:
{
  "title": "Título SEO optimizado de 60 caracteres máximo",
  "subtitle": "Subtítulo PODEROSO que vende de 120 caracteres",
  "description": "Descripción COMPLETA de 350-450 palabras muy persuasiva y profesional que explique los beneficios, transformación, y valor único del libro",
  "shortDescription": "Resumen impactante de 140-150 caracteres para meta description",
  "keywords": ["15 palabras clave estratégicas de alta búsqueda (Incluir las Base si son relevantes)"],
  "categories": ["5-7 categorías precisas de Amazon KDP"],
  "emailSubject": "Asunto de Email IRRESISTIBLE para lista de espera (alta tasa de apertura)",
  "emailBody": "Correo de venta persuasivo (200 palabras) usando el framework AIDA (Atención, Interés, Deseo, Acción).",
  "instagramCaption": "Caption para Instagram/TikTok viral con emojis, gancho inicial y llamado a la acción claro.",
  "hashtags": ["#${book.genre?.replace(/\s+/g, '') || 'Libro'}", "#BookTok", "#Leer", "#Marketing", "10 hashtags virales más"]
}

IMPORTANTE:
1. La descripción debe ser de 350-450 palabras COMPLETAS. Nada de "---".
2. El email debe ser profesional y persuasivo.
3. El caption debe estar optimizado para engagement.`

    let generalCopyRaw = ''
    try {
      generalCopyRaw = await generateWithAI(generalPrompt, textConfig)
    } catch (e) {
      console.error('Error generating general copy:', e)
    }

    let generalCopy: any = {}
    try {
      const cleaned = generalCopyRaw.replace(/```json/g, '').replace(/```/g, '').trim()
      generalCopy = JSON.parse(cleaned)
    } catch {
      // Fallback mejorado con Kit de Lanzamiento
      generalCopy = {
        title: `${book.title} - La Guía Definitiva`,
        subtitle: `Domina ${book.genre} con ${book.chapters?.length || 0} Capítulos Profesionales`,
        description: `Descubre ${book.title}, una obra completa de ${wordCount} palabras distribuidas en ${book.chapters?.length || 0} capítulos cuidadosamente estructurados. Este libro te guiará paso a paso hacia el dominio completo del tema, proporcionándote estrategias probadas, técnicas avanzadas, y conocimientos profundos.`,
        shortDescription: `Guía completa de ${book.genre} con ${book.chapters?.length || 0} capítulos profesionales`,
        keywords: [book.genre, 'ebook', 'guía', 'curso', 'completo', 'tutorial', 'profesional', 'aprendizaje', 'manual', 'digital', 'pdf', 'epub'],
        categories: [book.genre, 'Educación', 'No Ficción', 'Autoayuda', 'Referencia'],
        emailSubject: `🔥 ¡Por fin disponible! ${book.title} ya está aquí`,
        emailBody: `Hola [Nombre],\n\nLa espera ha terminado. Hoy lanzo oficialmente mi nuevo libro: "${book.title}".\n\nHe dedicado meses a condensar todo mi conocimiento sobre ${book.genre} en esta guía definitiva de ${book.chapters?.length || 0} capítulos.\n\nEn este libro descubrirás:\n- Secretos no revelados de ${book.genre}\n- Estrategias paso a paso\n- Herramientas prácticas para aplicar hoy mismo\n\nSolo por lanzamiento, puedes obtenerlo con un descuento especial aquí: [ENLACE]\n\n¡Nos vemos dentro!\n\nUn abrazo,\nEl Autor`,
        instagramCaption: `🚀 ¡GRAN LANZAMIENTO! 🚀\n\nEstoy emocionado de anunciar que mi nuevo libro "${book.title}" ya está disponible.\n\n📚 ¿Quieres dominar ${book.genre}? Esta es tu oportunidad.\n\n👇 Comenta "LIBRO" y te envío el enlace con descuento.\n\n#${book.genre?.replace(/\s+/g, '') || 'NuevoLibro'} #Lanzamiento #AuthorLife #Ebook`,
        hashtags: ['#NuevoLanzamiento', '#Ebook', '#AmazonKDP', '#Kindle', '#Leer', '#Aprender', '#LibrosRecomendados', '#Bookstagram']
      }
    }

    // === MARKETPLACE COPYWRITING (250-300 words each) ===
    // Calculate dynamic price based on word count and chapters
    const totalWords = wordCount || 0
    const numChapters = book.chapters?.length || 1
    const basePrice = 9.99
    const perThousandWords = 2.15
    const perChapter = 0.85
    const qualityMultiplier = 1 + (numChapters > 5 ? 0.12 : 0)
    const calculatedPrice = Math.max(12.99, (basePrice + (totalWords / 1000 * perThousandWords) + (numChapters * perChapter)) * qualityMultiplier)

    const marketplaces = [
      { id: 'amazon-kdp', name: 'Amazon KDP', priceMultiplier: 1.0, focus: 'SEO de Amazon, categorías precisas, y formato Kindle. Usa A+ Content style.' },
      { id: 'gumroad', name: 'Gumroad', priceMultiplier: 1.15, focus: 'Tono personal, storytelling, beneficios directos. Gumroad premia las descripciones auténticas.' },
      { id: 'etsy', name: 'Etsy', priceMultiplier: 0.95, focus: 'Enfoque artesanal, único, handmade-feeling. Etsy favorece productos con descripciones detalladas y tags específicos.' },
      { id: 'shopify', name: 'Shopify', priceMultiplier: 1.20, focus: 'Branding profesional, tono corporativo, CTA claros. Shopify es para marcas establecidas.' },
      { id: 'hotmart', name: 'Hotmart', priceMultiplier: 1.10, focus: 'Mercado hispanohablante. Usa lenguaje persuasivo latinoamericano, promesas de transformación, testimoniales.' }
    ]

    const marketplaceCopies: Record<string, any> = {}

    for (const marketplace of marketplaces) {
      const platformPrice = (calculatedPrice * marketplace.priceMultiplier).toFixed(2)
      
      const prompt = `Eres experto en ventas para ${marketplace.name}.

INSTRUCCIONES ESPECÍFICAS PARA ${marketplace.name}:
${marketplace.focus}

${seoContext}

Genera copywriting comercial EXTENSO para:
- Título: ${book.title}
- Género: ${book.genre}
- Capítulos: ${book.chapters?.length || 0}
- Palabras: ${wordCount}
- Precio base calculado: $${platformPrice}

Formato JSON:
{
  "title": "Título optimizado específicamente para ${marketplace.name} (80 caracteres)",
  "price": "$${platformPrice}",
  "description": "Descripción comercial persuasiva de 250-300 palabras COMPLETAS específica para la audiencia de ${marketplace.name}",
  "shortDescription": "Resumen de 150 caracteres optimizado para ${marketplace.name}",
  "bulletPoints": ["7-10 puntos de venta poderosos adaptados a ${marketplace.name}"],
  "targetAudience": "Perfil detallado de audiencia objetivo de ${marketplace.name}",
  "keywords": ["7-10 palabras clave optimizadas para búsquedas en ${marketplace.name}"],
  "categories": ["3-5 categorías precisas"]
}

CRÍTICO: La descripción debe tener 250-300 palabras reales adaptadas al tono de ${marketplace.name}. Nada de "---".`

      let copyRaw = ''
      try {
        copyRaw = await generateWithAI(prompt, textConfig)
      } catch (e) {
        console.error(`Error generating ${marketplace.id} copy:`, e)
      }

      try {
        const cleaned = copyRaw.replace(/```json/g, '').replace(/```/g, '').trim()
        marketplaceCopies[marketplace.id] = JSON.parse(cleaned)
        marketplaceCopies[marketplace.id].marketplace = marketplace.name
        // Ensure price is set from our calculation
        marketplaceCopies[marketplace.id].price = `$${platformPrice}`
      } catch {
        // Platform-specific fallback content
        const platformFallbacks: Record<string, any> = {
          'amazon-kdp': {
            marketplace: 'Amazon KDP',
            title: `${book.title}: Guía Completa de ${book.genre} | Edición Kindle`,
            price: `$${platformPrice}`,
            description: `📚 DESCRIPCIÓN DEL PRODUCTO\n\n${book.title} es la guía definitiva para dominar ${book.genre}. Con ${book.chapters?.length || 0} capítulos meticulosamente estructurados y más de ${wordCount} palabras de contenido experto, este ebook te proporciona todo lo que necesitas para transformar tu conocimiento.\n\n✅ INCLUYE:\n• Contenido organizado en ${book.chapters?.length || 0} capítulos progresivos\n• Estrategias paso a paso aplicables de inmediato\n• Ejemplos prácticos y casos de estudio reales\n• Formato optimizado para Kindle, tablet y móvil\n\n🎯 PERFECTO PARA:\nPrincipianBtes que buscan una base sólida, intermedios que quieren avanzar, y profesionales que desean actualizar sus conocimientos.\n\n⭐ GARANTÍA: Contenido de calidad respaldado por investigación y experiencia práctica.`,
            shortDescription: `Guía completa de ${book.genre} - ${book.chapters?.length} caps, ${wordCount}+ palabras. Formato Kindle optimizado.`,
            bulletPoints: [
              `📖 ${book.chapters?.length || 0} capítulos estructurados profesionalmente`,
              `✅ Más de ${wordCount} palabras de contenido valioso`,
              '🎯 Estrategias paso a paso fáciles de implementar',
              '💡 Ejemplos prácticos y casos de estudio',
              '📱 Optimizado para Kindle, tablet y móvil',
              '⚡ Descarga instantánea tras la compra',
              '🔄 Actualizaciones gratuitas incluidas'
            ],
            targetAudience: `Lectores de Amazon interesados en ${book.genre}, desde principiantes hasta nivel avanzado`,
            keywords: [book.genre, 'ebook kindle', 'guía completa', book.title.split(' ')[0], 'curso digital', 'aprendizaje', 'manual práctico'],
            categories: [book.genre, 'Libros electrónicos Kindle', 'No ficción']
          },
          'gumroad': {
            marketplace: 'Gumroad',
            title: `${book.title} ✨ Tu Guía Personal de ${book.genre}`,
            price: `$${platformPrice}`,
            description: `Hey! 👋\n\nDespués de meses de trabajo, finalmente está aquí: ${book.title}.\n\nEste no es otro ebook genérico. Es el resultado de condensar todo lo que sé sobre ${book.genre} en ${book.chapters?.length || 0} capítulos que puedes aplicar HOY.\n\n🔥 ¿Qué vas a obtener?\n${wordCount}+ palabras de contenido sin relleno, directo al punto. Cada capítulo está diseñado para darte resultados tangibles.\n\n💡 La diferencia:\nNo voy a prometerte resultados mágicos de la noche a la mañana. Lo que SÍ te prometo es que si aplicas lo que está en este ebook, vas a ver cambios reales.\n\n¿Listo para empezar? El botón está ahí arriba 👆\n\nPD: Cualquier duda, me escribes. Respondo personalmente.`,
            shortDescription: `${book.chapters?.length} capítulos de puro valor sobre ${book.genre}. Sin relleno, solo lo que funciona. 🔥`,
            bulletPoints: [
              `🔥 ${book.chapters?.length || 0} capítulos sin relleno`,
              `💪 ${wordCount}+ palabras de contenido actionable`,
              '✨ Descarga instantánea en PDF',
              '💬 Soporte directo del creador',
              '🎁 Updates gratis de por vida',
              '💯 Garantía de satisfacción',
              '🚀 Empieza a aplicarlo hoy mismo'
            ],
            targetAudience: `Creadores, emprendedores y autodidactas que valoran contenido directo y sin BS sobre ${book.genre}`,
            keywords: ['ebook', book.genre, 'guía práctica', 'curso', 'tutorial', book.title.split(' ')[0], 'creador'],
            categories: ['eBooks', book.genre, 'Desarrollo Personal']
          },
          'etsy': {
            marketplace: 'Etsy',
            title: `${book.title} | Ebook PDF Descargable | Guía de ${book.genre} | Lectura Digital`,
            price: `$${platformPrice}`,
            description: `📘 EBOOK DIGITAL DESCARGABLE\n\n¡Bienvenido a mi tienda! Me emociona presentarte "${book.title}", un ebook cuidadosamente elaborado sobre ${book.genre}.\n\n📦 LO QUE RECIBIRÁS:\n• 1 archivo PDF de alta calidad\n• ${book.chapters?.length || 0} capítulos completos\n• Más de ${wordCount} palabras de contenido original\n• Formato optimizado para pantalla y tablet\n\n✨ CARACTERÍSTICAS:\n• Diseño limpio y fácil de leer\n• Ilustraciones y gráficos incluidos\n• Índice navegable\n• Imprimible si lo prefieres\n\n⚡ ENTREGA INSTANTÁNEA:\nRecibirás el link de descarga inmediatamente después de la compra.\n\n💌 NOTA DEL VENDEDOR:\nCada ebook está hecho con dedicación. Si tienes alguna pregunta, no dudes en contactarme.\n\n¡Gracias por apoyar a creadores independientes! 🙏`,
            shortDescription: `Ebook PDF ${book.genre} | ${book.chapters?.length} capítulos | ${wordCount}+ palabras | Descarga instantánea digital`,
            bulletPoints: [
              '📥 Descarga digital instantánea',
              `📖 ${book.chapters?.length || 0} capítulos completos`,
              `✍️ ${wordCount}+ palabras de contenido original`,
              '🖨️ PDF imprimible de alta calidad',
              '📱 Legible en cualquier dispositivo',
              '✨ Diseño artesanal único',
              '💚 Apoya a creadores independientes'
            ],
            targetAudience: `Compradores de Etsy que buscan productos digitales únicos y de calidad sobre ${book.genre}`,
            keywords: ['ebook pdf', 'descarga digital', book.genre, 'guía descargable', 'libro digital', book.title.split(' ')[0], 'lectura instantánea'],
            categories: ['Descargas Digitales', 'Ebooks', book.genre]
          },
          'shopify': {
            marketplace: 'Shopify',
            title: `${book.title} | Programa Completo de ${book.genre}`,
            price: `$${platformPrice}`,
            description: `DOMINA ${book.genre.toUpperCase()} CON NUESTRO PROGRAMA MÁS COMPLETO\n\n${book.title} es el recurso definitivo para profesionales y entusiastas que buscan resultados reales.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n📊 ESTADÍSTICAS DEL PRODUCTO\n━━━━━━━━━━━━━━━━━━━━━━━━\n• ${book.chapters?.length || 0} Módulos de contenido\n• ${wordCount}+ Palabras de material experto\n• Actualizaciones incluidas\n• Acceso de por vida\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n🎯 RESULTADOS ESPERADOS\n━━━━━━━━━━━━━━━━━━━━━━━━\n• Dominio completo de los fundamentos\n• Habilidades prácticas aplicables\n• Conocimiento de nivel profesional\n• Ventaja competitiva en tu campo\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n✅ GARANTÍA\n━━━━━━━━━━━━━━━━━━━━━━━━\n30 días de garantía de satisfacción. Si no ves valor, te devolvemos tu inversión.`,
            shortDescription: `Programa profesional de ${book.genre}. ${book.chapters?.length} módulos, ${wordCount}+ palabras. Acceso de por vida.`,
            bulletPoints: [
              `📚 ${book.chapters?.length || 0} módulos de contenido profesional`,
              `📝 ${wordCount}+ palabras de material experto`,
              '🔒 Acceso de por vida a actualizaciones',
              '💼 Contenido de nivel empresarial',
              '⚡ Entrega digital instantánea',
              '🛡️ Garantía de satisfacción 30 días',
              '📧 Soporte por email prioritario'
            ],
            targetAudience: `Profesionales, empresarios y equipos que invierten en formación de calidad sobre ${book.genre}`,
            keywords: [book.genre, 'curso profesional', 'programa completo', book.title.split(' ')[0], 'formación empresarial', 'desarrollo profesional'],
            categories: ['Productos Digitales', 'Formación', book.genre]
          },
          'hotmart': {
            marketplace: 'Hotmart',
            title: `${book.title} | El Método Comprobado para Dominar ${book.genre}`,
            price: `$${platformPrice}`,
            description: `🚀 ¿LISTO PARA TRANSFORMAR TU VIDA?\n\n¡Hola! Te presento ${book.title}, el ebook que va a cambiar tu forma de ver ${book.genre}.\n\n💡 ESTO ES PARA TI SI:\n✓ Quieres resultados REALES, no teoría vacía\n✓ Buscas información probada que funciona\n✓ Estás cansado de cursos que no cumplen\n✓ Valoras tu tiempo y quieres ir directo al grano\n\n📚 ¿QUÉ VAS A RECIBIR?\n• ${book.chapters?.length || 0} capítulos con el método paso a paso\n• ${wordCount}+ palabras de contenido transformador\n• Acceso inmediato tras la compra\n• Actualizaciones GRATIS de por vida\n\n⚡ TRANSFORMA TU CONOCIMIENTO EN RESULTADOS\n\nEste no es un ebook más. Es el sistema que he perfeccionado para que TÚ puedas lograr lo que otros solo sueñan.\n\n🔥 OFERTA ESPECIAL: Precio de lanzamiento por tiempo limitado.\n\n¡Nos vemos adentro! 🎯`,
            shortDescription: `🔥 Método probado de ${book.genre} | ${book.chapters?.length} capítulos | ${wordCount}+ palabras | ¡Transforma tu vida hoy!`,
            bulletPoints: [
              `🎯 ${book.chapters?.length || 0} capítulos con metodología probada`,
              `📖 ${wordCount}+ palabras de contenido transformador`,
              '⚡ Acceso inmediato tras la compra',
              '🔄 Actualizaciones gratis de por vida',
              '💬 Comunidad de estudiantes (próximamente)',
              '🏆 Certificado de finalización',
              '💯 Garantía de 7 días Hotmart'
            ],
            targetAudience: `Hispanohablantes ambiciosos que buscan transformar su vida a través del conocimiento de ${book.genre}`,
            keywords: [book.genre, 'curso online', 'ebook transformador', book.title.split(' ')[0], 'método probado', 'resultados', 'éxito'],
            categories: ['Desarrollo Personal', book.genre, 'Infoproductos']
          }
        }
        
        marketplaceCopies[marketplace.id] = platformFallbacks[marketplace.id] || {
          marketplace: marketplace.name,
          title: `${book.title} | ${book.genre}`,
          price: `$${platformPrice}`,
          description: `${book.title} - Guía completa de ${book.genre}`,
          shortDescription: `Ebook de ${book.genre}`,
          bulletPoints: [`${book.chapters?.length} capítulos`, `${wordCount} palabras`],
          targetAudience: `Interesados en ${book.genre}`,
          keywords: [book.genre],
          categories: [book.genre]
        }
      }
    }

    return NextResponse.json({
      success: true,
      general: generalCopy,
      marketplaces: marketplaceCopies
    })

  } catch (error: any) {
    console.error('Copywriting generation error:', error)
    return NextResponse.json(
      { error: 'Error al generar copywriting: ' + (error.message || 'Error desconocido') },
      { status: 500 }
    )
  }
}
