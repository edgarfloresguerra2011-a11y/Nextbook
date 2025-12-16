'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  ArrowLeft, Download, FileText, Share2, 
  Check, Copy, Wand2, Lock, Monitor, Zap, ExternalLink, Rocket, Globe, Book, Save, BookOpen, Settings, LogOut, Loader2, Link as LinkIcon, CheckCircle2, Sparkles, Eye, List, Grid3X3
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

// Interfaces
interface Book {
  id: string
  title: string
  description: string
  genre: string
  chapters: Chapter[]
  coverImageUrl?: string | null
  createdAt: Date
}

interface Chapter {
  id: string
  title: string
  content: string
}

interface Copywriting {
  title: string
  description: string
  shortDescription: string
  bulletPoints: string[]
  targetAudience: string
  keywords: string[]
  categories: string[]
  emailSubject: string
  emailBody: string
  hashtags: string[]
  price: string
}

interface MarketplaceCopy {
  marketplace: string 
  title: string
  description: string
  shortDescription?: string
  bulletPoints?: string[]
  targetAudience?: string
  keywords?: string[]
  categories?: string[]
  price?: string 
}

interface ExportClientProps {
  book: Book
  hasActiveSubscription: boolean
}

interface Integration {
  id: string
  platform: string
  status: string
  link: string | null
}

interface Marketplace {
  id: string
  name: string
  color: string
  bgColor: string
  bgColorLight: string
  borderColor: string
  textColor: string
  description: string
  formats: string[]
  url: string
  IconComponent: any
  hasApi: boolean
  apiStatus: string
  isPublished: boolean
}

// --- ORIGINAL BRAND ICONS ---
// Reverting to detailed SVG paths for authenticity

const AmazonIcon = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#FF9900">
    <path d="M13.7 23.5c-.8 0-1.8-.2-2.6-.5-4.2-1.4-6.3-4.5-5.3-7.5.3-.9.9-1.4 1.7-1.4.3 0 .7.1 1.1.2.6.2.7.5.7.8 0 .8-2 1.4-2.5 3-.4 1.3 1.2 3.1 4.5 4.3 2 .8 3.8.8 4.6.4.5-.3.5-.7.4-.9-.3-.5-1-.5-2.2-.6-1 0-1.9-.1-2.6-.2-2.3-.6-3.7-1.9-3.7-3.6 0-2.6 3.1-4.7 9.2-4.7 1.8 0 3.1.2 3.7.3l-.2 1.6c-.6-.2-1.7-.4-3.1-.4-4.5 0-6.6 1.4-6.6 3 0 .9.8 1.5 2.5 1.9.4.1 1.2.2 2 .2 3.8.1 6.5-1.9 6.5-5.1 0-2.6-1.9-4.3-5.5-4.3-3.9 0-6.4 2.2-6.4 5.3 0 1 .3 2.1.9 3.2.3.6.3 1 .1 1.3-.2.3-.6.5-1 .5-.3 0-.6-.2-1-.8-.8-1.5-1.2-3.1-1.2-4.5 0-4.3 3.5-7.4 8.7-7.4 4.7 0 7.4 2.4 7.4 6 0 4.3-3.6 6.9-8.5 6.8h-.8l.2 2.6c1.1-.3 2.1-.8 3-1.6.4-.3.9-.2 1.1.2.2.4.2.9-.2 1.3-1.1 1-2.4 1.7-4 2.1z"/>
  </svg>
)

const GumroadIcon = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#FF90E8">
     <path d="M4.346 2.977c2.308-.225 3.996-1.218 5.764.126 1.93 1.467 2.378 5.56 2.378 10.368 0 2.28-.204 4.417-.557 6.136-1.554.437-3.155.845-4.802 1.222-.44-1.293-.728-2.65-.86-4.062a26.046 26.046 0 0 1-.166-4.562c.032-2.18.25-3.328 1.782-4.102 0 0-1.127-.723-1.764-.723-1.895 0-3.332 1.503-3.905 5.584-.337.078-.667.158-.992.239-.564 5.253 2.893 8.356 8.528 7.398 5.485-.933 11.246-8.572 11.246-15.013 0-5.518-3.048-5.323-5.378-5.323-3.562 0-8.834 2.484-11.274 2.712zm10.74 3.737c1.373 1.259 1.488 4.295.347 10.158 1.485-3.333 1.637-6.845.895-8.89-.356-.98-1.242-1.268-1.242-1.268z" fill="#ff90e8" />
  </svg>
)

const EtsyIcon = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#F1641E">
    <path d="M9.622 13.916h3.411v-2.583H9.622v-2.903h6.143V4.832H5.917v14.336h9.848v-3.64H9.622v-1.612zm12.903-7.25c-.378.161-.755.228-1.108.228h-5.286v3.313h3.538c.378 0 .546-.062.546-.228V7.994h.731v3.94h-.731v-1.666c0-.147-.168-.228-.546-.228h-3.538v5.45h5.452c.353 0 .731-.08.109-.23.353-.146.546-.453.546-.906v-1.512h-.73c-.378.755-.907 1.133-1.637 1.133h-2.915v-9.1h2.915c.73 0 1.26.378 1.638 1.135h.73V4.385c0-.453-.194-.755-.555-.907-.353-.151-.714-.227-1.083-.227h-7.279v.983h1.46v12.432h-1.46v.983h5.099c.176-.226.453-.377.806-.453.353-.075.73-.075 1.1-.075h3.351c.362 0 .73-.082 1.093-.227.362-.15.547-.453.547-.907V7.573c0-.453-.185-.756-.547-.907zM8.561 2.571c-.361-.075-.729-.075-1.092-.075H4.113c-.363 0-.731.062-1.092.227-.361.15-.546.453-.546.907v1.662h.731c.361-.756.907-1.134 1.637-1.134h1.277c.73 0 1.092.378 1.092 1.134v3.18h-1.293c-.362 0-.546.069-.546.228v1.512c0 .15.184.228.546.228h2.292v5.375c0 .755-.362 1.133-1.091 1.133H4.298c-.73 0-1.277-.378-1.638-1.133h-.731v1.664c0 .453.185.755.546.907.361.151.729.227 1.092.227h3.359c.361 0 .73 0 1.092-.076.362-.076.639-.227.815-.453V2.647c-.176-.076-.353-.076-.731-.076z"/>
  </svg>
)

const ShopifyIcon = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#95BF47">
    <path d="M22.95 9.6a1.32 1.32 0 0 0-.25-.37l-6-6.3a1.31 1.31 0 0 0-1.26-.35c-1 .21-9.92 2.15-9.92 2.15l-1.6 4.35H2.68c-.91 0-1.57.85-1.39 1.74l2.43 12.04c.16.8 1.16 1.34 1.95 1.05l17.09-6.21a1.32 1.32 0 0 0 .84-1.38L22.95 9.6zM15.43 5.48l1.41 3.53h-3.41l2-3.53zm-5.61 1.25l1.6 4.09 1.61-2.82-3.21-1.27zm-5.45 6.43l1.24-3.39 1.78.71-1.52 7.55-1.5-4.87z"/>
  </svg>
)

const HotmartIcon = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#F04E23">
     <path d="M15.7 2.8c-1.8 1.4-2.8 3.5-3.3 5.7-.5 2.2-.4 4.5.4 6.6.6 2.1 2.1 3.8 4 5 .2.1.4.3.4.6 0 .3-.2.5-.4.6-.3.1-.7 0-.9-.2-2.3-1.4-3.9-3.7-4.5-6.3-.6-2.6-.2-5.3 1.2-7.6l.2-.3c.2-.4.1-.9-.3-1.1-.4-.2-.9-.1-1.1.3-1 1.5-1.6 3.2-1.9 5-.3 1.8-.1 3.7.6 5.4.5 1.3 1.3 2.5 2.4 3.5.2.2.3.6.1.9-.2.3-.6.3-.9.1-1.4-1.3-2.3-2.9-2.9-4.7-.6-1.8-.7-3.7-.3-5.6.3-2 1.2-3.9 2.5-5.5.3-.3.3-.8-.1-1.1-.3-.3-.8-.3-1.1 0z"/>
  </svg>
)

export default function ExportClient({ book, hasActiveSubscription }: ExportClientProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('integrations')
  const [copyData, setCopyData] = useState<Copywriting | null>(null)
  const [marketplaceCopies, setMarketplaceCopies] = useState<MarketplaceCopy[]>([])
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<Record<string, Integration>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Load saved data
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/books/${book.id}/export`)
        if (res.ok) {
          const data = await res.json()
          if (data.format) setSelectedFormat(data.format)
          
          if (data.copyData) {
            setCopyData(data.copyData.general)
            if (data.copyData.marketplaces) {
               if (Array.isArray(data.copyData.marketplaces)) {
                   setMarketplaceCopies(data.copyData.marketplaces)
               } else {
                   setMarketplaceCopies(Object.values(data.copyData.marketplaces))
               }
            }
          }

          if (data.integrations) {
            const intMap: Record<string, Integration> = {}
            data.integrations.forEach((i: Integration) => {
              intMap[i.platform] = i
            })
            setIntegrations(intMap)
          }
        }
      } catch (e) {
        console.error("Error loading export settings", e)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [book.id])
  
  // Stats
  const wordCount = book.chapters.reduce((acc, ch) => acc + (ch.content?.length || 0) / 6, 0)
  const pageCount = Math.ceil(wordCount / 250)
  const chapterCount = book.chapters.length
  const suggestedPrice = Math.max(9.99, (wordCount / 1000) * 0.8 + 15).toFixed(2)

  const marketplaces: Marketplace[] = [
    {
      id: "amazon-kdp",
      name: "Amazon KDP",
      color: "from-amber-500 to-orange-600",
      bgColor: "bg-[#FF9900]",
      bgColorLight: "bg-[#FF9900]/10",
      borderColor: "border-[#FF9900]/30",
      textColor: "text-[#FF9900]",
      description: "Publica en la mayor plataforma de ebooks del mundo",
      formats: ["PDF", "KPF", "EPUB"],
      url: "https://kdp.amazon.com",
      IconComponent: AmazonIcon,
      hasApi: false, 
      apiStatus: "No soporta API pública",
      isPublished: true
    },
    {
      id: "gumroad",
      name: "Gumroad",
      color: "from-pink-500 to-rose-600",
      bgColor: "bg-[#FF90E8]",
      bgColorLight: "bg-[#FF90E8]/10",
      borderColor: "border-[#FF90E8]/30",
      textColor: "text-[#FF90E8]",
      description: "Vende directamente a tu audiencia sin intermediarios",
      formats: ["PDF", "EPUB"],
      url: "https://gumroad.com",
      IconComponent: GumroadIcon,
      hasApi: true,
      apiStatus: "Integración Disponible",
      isPublished: false
    },
    {
      id: "etsy",
      name: "Etsy",
      color: "from-orange-500 to-red-600",
      bgColor: "bg-[#F1641E]",
      bgColorLight: "bg-[#F1641E]/10",
      borderColor: "border-[#F1641E]/30",
      textColor: "text-[#F1641E]",
      description: "Marketplace para productos digitales creativos",
      formats: ["PDF"],
      url: "https://etsy.com",
      IconComponent: EtsyIcon,
      hasApi: true,
      apiStatus: "Integración Disponible",
      isPublished: false
    },
    {
      id: "shopify",
      name: "Shopify",
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-[#95BF47]",
      bgColorLight: "bg-[#95BF47]/10",
      borderColor: "border-[#95BF47]/30",
      textColor: "text-[#5E8E3E]",
      description: "Crea tu propia tienda online profesional",
      formats: ["PDF", "EPUB"],
      url: "https://shopify.com",
      IconComponent: ShopifyIcon,
      hasApi: true,
      apiStatus: "Integración Disponible",
      isPublished: false
    },
    {
      id: "hotmart",
      name: "Hotmart",
      color: "from-orange-600 to-red-600",
      bgColor: "bg-[#F04E23]",
      bgColorLight: "bg-[#F04E23]/10",
      borderColor: "border-[#F04E23]/30",
      textColor: "text-[#F04E23]",
      description: "Plataforma líder en productos digitales en español",
      formats: ["PDF", "EPUB"],
      url: "https://hotmart.com",
      IconComponent: HotmartIcon,
      hasApi: true,
      apiStatus: "Integración Disponible",
      isPublished: false
    }
  ]

  const handleGenerateCopy = async () => {
    setIsGeneratingCopy(true)
    try {
      const response = await fetch(`/api/books/${book.id}/copywriting`, { method: 'POST' })
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      
      const copy = data.general
      const marketCopies = data.marketplaces

      setCopyData(copy)
      
      // Handle array vs object
      let marketCopiesArray: MarketplaceCopy[] = []
      if (marketCopies) {
        if (Array.isArray(marketCopies)) {
            marketCopiesArray = marketCopies
        } else if (typeof marketCopies === 'object') {
            marketCopiesArray = Object.values(marketCopies)
        }
      }
      setMarketplaceCopies(marketCopiesArray)

      // Save to DB
      await fetch(`/api/books/${book.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           action: 'save_copywriting',
           data: { general: copy, marketplaces: marketCopiesArray }
        })
      })

      toast.success("Copywriting generado y guardado con éxito")
    } catch (e) {
        console.error(e)
      toast.error("Error generando copywriting")
    } finally {
      setIsGeneratingCopy(false)
    }
  }

  const handleCopyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldId)
      toast.success("Copiado al portapapeles")
      setTimeout(() => setCopiedField(null), 2000)
    } catch (e) {
      toast.error("Error al copiar")
    }
  }

  const handleCopyAll = async (marketplace: MarketplaceCopy) => {
    const allText = `Título Optimizado: ${marketplace.title}

Descripción:
${marketplace.description}

${marketplace.bulletPoints?.length ? `Beneficios:
${marketplace.bulletPoints.map(b => `• ${b}`).join('\n')}` : ''}

${marketplace.keywords?.length ? `Palabras Clave: ${marketplace.keywords.join(', ')}` : ''}

${marketplace.price ? `Precio Sugerido: ${marketplace.price}` : ''}`
    
    await handleCopyToClipboard(allText, `all-${marketplace.marketplace}`)
  }

  const handleSelectFormat = async (format: string) => {
      setSelectedFormat(format)
      // Save
      await fetch(`/api/books/${book.id}/export`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ action: 'save_format', data: { format } })
      })
      toast.info(`Formato ${format.toUpperCase()} seleccionado`)
  }

  const handleDownload = (format: string) => {
    handleSelectFormat(format)
    toast.success(`Descargando ${format.toUpperCase()}...`)
    window.open(`/api/books/${book.id}/${format.toLowerCase()}`, '_blank')
  }

  const handleSaveIntegration = async (platform: string, link: string) => {
      // Save status
      const updated = { ...integrations, [platform]: { id: '', platform, status: 'connected', link } }
      setIntegrations(updated as any)

      await fetch(`/api/books/${book.id}/export`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ action: 'save_integration', data: { platform, link, status: 'connected' } })
      })
      toast.success("Integración guardada")
  }

  const getMarketplaceConfig = (idOrName: string) => {
    const term = idOrName.toLowerCase()
    return marketplaces.find(m => 
      m.id.includes(term) || 
      term.includes(m.id) || 
      m.name.toLowerCase().includes(term) || 
      term.includes(m.name.toLowerCase())
    ) || marketplaces[0]
  }

  if (isLoading) {
      return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600"/></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link 
          href={`/books/${book.id}`} 
          className="inline-flex items-center text-gray-500 mb-6 hover:text-purple-600 transition-colors text-sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al libro
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Rocket className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Centro de Exportación</h1>
            <p className="text-gray-500 text-sm mt-1">{book.title}</p>
          </div>
        </div>

        {/* Stats Cards - 4 columns */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Total de Palabras</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(wordCount).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Páginas Aprox</p>
              <p className="text-2xl font-bold text-gray-900">{pageCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Capítulos</p>
              <p className="text-2xl font-bold text-gray-900">{chapterCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">Precio Sugerido</p>
              <p className="text-2xl font-bold text-green-600">${suggestedPrice}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="integrations" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white border border-gray-200 p-1 mb-8 w-full justify-start h-auto rounded-lg">
             <TabsTrigger 
              value="integrations" 
              className="px-4 py-2.5 text-sm data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 text-gray-500 rounded-md"
            >
              <Share2 className="mr-2 h-4 w-4" /> Integraciones
            </TabsTrigger>

            <TabsTrigger 
              value="formats" 
              className="px-4 py-2.5 text-sm data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-500 rounded-md"
            >
              <Download className="mr-2 h-4 w-4" /> Formatos
            </TabsTrigger>
            <TabsTrigger 
              value="copywriting" 
              className="px-4 py-2.5 text-sm data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-500 rounded-md"
            >
              <Wand2 className="mr-2 h-4 w-4" /> Copywriting
            </TabsTrigger>
            <TabsTrigger 
              value="preview" 
              className="px-4 py-2.5 text-sm data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 text-gray-500 rounded-md font-medium"
            >
              <Eye className="mr-2 h-4 w-4" /> Previsualización
            </TabsTrigger>
            <TabsTrigger 
              value="mockups" 
              className="px-4 py-2.5 text-sm data-[state=active]:bg-pink-50 data-[state=active]:text-pink-700 text-gray-500 rounded-md font-medium"
            >
              <Sparkles className="mr-2 h-4 w-4" /> Mockups Publicitarios
            </TabsTrigger>
          </TabsList>

          {/* ============================================ */}
          {/* TAB: RESUMEN */}
          {/* ============================================ */}


          {/* ============================================ */}
          {/* TAB: FORMATOS */}
          {/* ============================================ */}
          <TabsContent value="formats" className="m-0 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Formatos Disponibles</h2>
              <p className="text-gray-500 text-sm">Selecciona y descarga tu formato preferido</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              {['pdf', 'epub', 'docx'].map((fmt) => (
                <Card 
                    key={fmt} 
                    className={`bg-white transition-colors border-2 ${selectedFormat === fmt ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300'}`}
                >
                    <CardContent className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 uppercase">{fmt}</h3>
                    <p className="text-gray-500 text-sm mb-6">Optimizado para distribución</p>
                    <Button 
                        className={`w-full ${selectedFormat === fmt ? 'bg-blue-700' : 'bg-blue-600'} hover:bg-blue-700 text-white`} 
                        onClick={() => handleDownload(fmt)}
                    >
                        <Download className="mr-2 h-4 w-4" /> {selectedFormat === fmt ? 'Volver a Descargar' : 'Descargar'}
                    </Button>
                    </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ============================================ */}
          {/* TAB: INTEGRACIONES / MARKETPLACES */}
          {/* ============================================ */}
          <TabsContent value="integrations" className="m-0 space-y-3">
            {marketplaces.map((mp) => {
                const integration = integrations[mp.id]
                const isConnected = integration?.status === 'connected'

                return (
                    <Card 
                        key={mp.id} 
                        className={`bg-white border-2 transition-colors ${isConnected ? 'border-green-200 bg-green-50/10' : 'border-gray-200'}`}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mp.bgColorLight} ${mp.textColor}`}>
                                        <mp.IconComponent />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-lg">{mp.name}</h3>
                                        <p className="text-sm text-gray-500">{mp.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isConnected && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Conectado</Badge>}
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="text-gray-600 border-gray-300 hover:bg-gray-50"
                                        onClick={() => window.open(mp.url, '_blank')}
                                    >
                                        <ExternalLink className="ml-2 h-4 w-4" /> Guía
                                    </Button>
                                </div>
                            </div>

                            {/* Integration Fields */}
                            <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                                <LinkIcon className="h-4 w-4 text-gray-400" />
                                <Input 
                                    className="bg-white border-gray-200 h-9" 
                                    placeholder={`Enlace de tu libro en ${mp.name}...`}
                                    defaultValue={integration?.link || ''}
                                    onBlur={(e) => handleSaveIntegration(mp.id, e.target.value)}
                                />
                                <Button size="sm" variant="ghost" className="text-gray-500" title="Guardado automático al salir del campo">
                                    <Save className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
          </TabsContent>

          {/* ... Copywriting Tab (Same as previous but with load data logic covered in useEffect) ... */}
           {/* ============================================ */}
          {/* TAB: COPYWRITING */}
          {/* ============================================ */}
          <TabsContent value="copywriting" className="m-0 space-y-8">
            {/* Estado: Sin generar */}
            {!copyData && !isGeneratingCopy && (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Genera Copywriting Profesional</h2>
                    <p className="text-gray-500">Utiliza IA para crear descripciones optimizadas para cada plataforma</p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">¿Qué obtendrás?</h3>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-sm text-gray-600">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          Título y subtítulo SEO optimizados
                        </li>
                        <li className="flex items-center gap-3 text-sm text-gray-600">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          Descripciones persuasivas (AIDA)
                        </li>
                        <li className="flex items-center gap-3 text-sm text-gray-600">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          Estrategia de precios por canal
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-4">
                       <h3 className="font-semibold text-gray-900">Plataformas incluidas</h3>
                       <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">Amazon KDP</Badge>
                          <Badge variant="secondary">Gumroad</Badge>
                          <Badge variant="secondary">Etsy</Badge>
                          <Badge variant="secondary">Shopify</Badge>
                          <Badge variant="secondary">Hotmart</Badge>
                       </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleGenerateCopy} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-medium shadow-md transition-all hover:scale-[1.01]"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generar Copywriting Profesional con IA
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Estado: Generando */}
            {isGeneratingCopy && (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Generando Estrategia de Ventas...</h3>
                <p className="text-gray-500">Analizando tu libro y optimizando para 5 marketplaces diferentes.</p>
              </div>
            )}

            {/* Estado: Generado */}
            {copyData && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Pack Marketing / Estrategia General */}
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-900">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      Pack Marketing Global
                    </CardTitle>
                    <CardDescription className="text-purple-700">Tu estrategia base para redes y lanzamiento</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white/60 p-3 rounded-lg border border-purple-100/50">
                           <p className="text-xs font-bold text-purple-400 uppercase mb-1">Título Optimizado</p>
                           <p className="font-medium text-gray-900">{copyData.title}</p>
                           <Button variant="ghost" size="sm" className="h-6 mt-1 text-xs text-purple-600 p-0 hover:bg-transparent" onClick={() => handleCopyToClipboard(copyData.title, 'title')}>Copiar</Button>
                        </div>
                         <div className="bg-white/60 p-3 rounded-lg border border-purple-100/50">
                           <p className="text-xs font-bold text-purple-400 uppercase mb-1">Subtítulo</p>
                           <p className="font-medium text-gray-900">{copyData.shortDescription}</p>
                           <Button variant="ghost" size="sm" className="h-6 mt-1 text-xs text-purple-600 p-0 hover:bg-transparent" onClick={() => handleCopyToClipboard(copyData.shortDescription, 'sub')}>Copiar</Button>
                        </div>
                     </div>
                     <div className="bg-white/60 p-3 rounded-lg border border-purple-100/50">
                        <p className="text-xs font-bold text-purple-400 uppercase mb-1">Hashtags Virales</p>
                        <p className="text-sm text-blue-600">{copyData.hashtags?.join(' ') || '#Libro #NuevoLanzamiento'}</p>
                        <Button variant="ghost" size="sm" className="h-6 mt-1 text-xs text-purple-600 p-0 hover:bg-transparent" onClick={() => handleCopyToClipboard(copyData.hashtags?.join(' '), 'tags')}>Copiar</Button>
                     </div>
                  </CardContent>
                </Card>

                {/* Marketplace Cards - Grid 2 columnas */}
                <div className="grid md:grid-cols-2 gap-6">
                  {marketplaceCopies.map((mp, idx) => {
                    const config = getMarketplaceConfig(mp.marketplace)
                    return (
                      <Card 
                        key={idx} 
                        className={`border transition-all duration-200 hover:shadow-md ${config.bgColorLight} ${config.borderColor}`}
                      >
                        <CardHeader className="pb-3 border-b border-black/5 bg-white/40">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-white`}>
                              <config.IconComponent />
                            </div>
                            <div className="flex-1">
                                <CardTitle className={`text-lg font-bold ${config.textColor}`}>{mp.marketplace}</CardTitle>
                                <p className="text-xs text-gray-500 font-medium tracking-wide">Copywriting optimizado específicamente para {mp.marketplace}</p>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="p-5 space-y-5">
                          {/* Precio - Destacado */}
                          <div className="flex flex-col">
                             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Precio Sugerido</span>
                             <span className="text-3xl font-extrabold text-green-600 tracking-tight">{mp.price}</span>
                          </div>

                          {/* Título */}
                          <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Título Optimizado</span>
                            <p className="font-semibold text-gray-800 leading-snug">{mp.title}</p>
                          </div>

                          {/* Audiencia */}
                          {mp.targetAudience && (
                            <div className="bg-white/50 p-3 rounded-lg border border-black/5">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Audiencia Objetivo</span>
                                <p className="text-sm text-gray-700 italic">"{mp.targetAudience}"</p>
                            </div>
                          )}

                          {/* Descripción */}
                          <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Descripción para {mp.marketplace}</span>
                            <p className="text-sm text-gray-600 leading-relaxed max-h-32 overflow-y-auto pr-1 customize-scrollbar">
                                {mp.description}
                            </p>
                          </div>

                          {/* Botón Copiar Todo - Pegado al fondo */}
                          <div className="pt-2">
                            <Button 
                                variant="outline" 
                                className="w-full bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-medium"
                                onClick={() => handleCopyAll(mp)}
                            >
                                <Copy className="mr-2 h-4 w-4" />
                                {copiedField === `all-${mp.marketplace}` ? '¡Copiado!' : `Copiar Todo para ${mp.marketplace}`}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
                
                 <div className="flex justify-center pt-8 pb-12">
                  <Button 
                    variant="ghost" 
                    onClick={handleGenerateCopy}
                    disabled={isGeneratingCopy}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Regenerar Contenido
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ============================================ */}
          {/* TAB: PREVIEW (Lectura) */}
          {/* ============================================ */}
          <TabsContent value="preview" className="m-0 space-y-6">
             <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <h2 className="text-xl font-bold text-gray-900">Vista de Lector</h2>
                   <p className="text-gray-500 text-sm">Verifica la legibilidad y apariencia de tu libro en dispositivos reales.</p>
                </div>
                <Badge variant="secondary" className="w-fit">Actualizado: Preview v2.0</Badge>
             </div>
             
             <DevicePreview book={book} />
          </TabsContent>

          {/* ============================================ */}
          {/* TAB: MOCKUPS (Marketing) */}
          {/* ============================================ */}
          <TabsContent value="mockups" className="m-0 space-y-6">
              <div className="mb-6">
                   <h2 className="text-xl font-bold text-gray-900">Mockups de Venta</h2>
                   <p className="text-gray-500 text-sm">Visualiza tu libro en composiciones profesionales de venta y branding.</p>
              </div>
              <MarketingMockups book={book} />
          </TabsContent>
          
{/* End of Tabs */}


        </Tabs>
      </div>
    </div>
  )
}

function MarketingMockups({ book }: { book: Book }) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
        
        {/* SCENE 1: Book + Phone (Reading Experience) */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden group hover:border-blue-400 transition-all shadow-sm hover:shadow-lg">
             <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white opacity-50"></div>
             <div className="relative z-10 flex items-end gap-x-4 transform translate-y-4 group-hover:translate-y-2 transition-transform duration-500">
                 {/* 3D Book Standing */}
                  <div className="relative w-32 aspect-[2/3] bg-white shadow-[10px_10px_30px_rgba(0,0,0,0.3)] transform -rotate-y-12 transition-transform duration-500 group-hover:rotate-0">
                      <div className="absolute inset-0 bg-white">
                          {book.coverImageUrl ? <img src={book.coverImageUrl} alt="Portada Libro 3D" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200" />}
                      </div>
                      {/* Spine hint */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-black/20 to-transparent"></div>
                  </div>

                  {/* Phone Leaning */}
                  <div className="relative w-16 h-32 bg-gray-900 rounded-xl border-2 border-gray-700 shadow-xl transform rotate-12 translate-x-2 -translate-y-2">
                       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-4 bg-gray-900 rounded-b-lg z-20"></div>
                       <div className="absolute inset-0.5 bg-white rounded-[10px] overflow-hidden">
                           {book.coverImageUrl && <img src={book.coverImageUrl} alt="Portada App" className="w-full h-full object-cover opacity-90" />}
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                               <div className="w-full h-1 bg-white/50 rounded-full"></div>
                           </div>
                       </div>
                  </div>
             </div>
             <div className="absolute bottom-4 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Libro + App</span>
             </div>
        </div>

        {/* SCENE 2: Three Devices (Digital Ecosystem) */}
         <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden group hover:border-purple-400 transition-all shadow-sm hover:shadow-lg">
             <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-blue-50/50 opacity-50"></div>
             
             <div className="relative z-10 flex items-end justify-center perspective-1000 transform scale-90 group-hover:scale-100 transition-transform duration-500">
                  {/* Laptop Back */}
                  <div className="relative mb-8 mr-[-40px] z-0 transform scale-75 origin-bottom-right opacity-80 blur-[0.5px] group-hover:blur-0 transition-all">
                       <div className="w-64 h-40 bg-gray-800 rounded-t-lg border-4 border-gray-700 overflow-hidden relative">
                            {book.coverImageUrl && <img src={book.coverImageUrl} alt="Fondo Laptop" className="w-full h-full object-cover opacity-70" />}
                       </div>
                       <div className="w-72 h-3 bg-gray-300 rounded-b-lg -ml-4 shadow-xl"></div>
                  </div>
                  
                  {/* Tablet Center */}
                  <div className="relative z-10 w-32 h-44 bg-gray-900 rounded-xl border-4 border-gray-800 shadow-2xl transform -rotate-6 mx-[-20px]">
                       <div className="w-full h-full bg-white rounded-lg overflow-hidden">
                            {book.coverImageUrl && <img src={book.coverImageUrl} alt="Pantalla Tablet" className="w-full h-full object-cover" />}
                       </div>
                  </div>

                  {/* Phone Front */}
                  <div className="relative z-20 w-14 h-28 bg-black rounded-xl border-2 border-gray-800 shadow-xl transform rotate-12 mb-2 ml-4">
                       <div className="w-full h-full bg-white rounded-[9px] overflow-hidden">
                            {book.coverImageUrl && <img src={book.coverImageUrl} alt="Pantalla Celular" className="w-full h-full object-cover" />}
                       </div>
                  </div>
             </div>
             <div className="absolute bottom-4 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Ecosistema Digital</span>
             </div>
        </div>

        {/* SCENE 3: FULL BUNDLE (Wide) */}
        <div className="md:col-span-2 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden group hover:shadow-2xl transition-all border border-slate-700">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/20 blur-[100px] rounded-full"></div>
            
            <div className="relative z-10 flex items-end justify-center gap-8 perspective-1000 transform scale-90 group-hover:scale-100 transition-transform duration-700">
                 {/* Stack of Books */}
                 <div className="relative transform rotate-y-12 translate-x-10 z-0 opacity-80">
                     <div className="w-40 aspect-[2/3] bg-white border-l-4 border-gray-300 shadow-2xl transform -rotate-6 rounded-l-sm"></div>
                     <div className="absolute top-2 w-40 aspect-[2/3] bg-white border-l-4 border-gray-300 shadow-2xl transform -rotate-3 rounded-l-sm"></div>
                 </div>

                 {/* Main Book */}
                 <div className="relative w-48 aspect-[2/3] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform -rotate-y-12 z-20 group-hover:translate-z-10 transition-transform">
                      {book.coverImageUrl ? <img src={book.coverImageUrl} alt="Portada Principal Pack" className="w-full h-full object-cover" /> : <div className="bg-gray-200"></div>}
                      {/* Reflection */}
                      <div className="absolute -bottom-[100%] left-0 right-0 h-full bg-gradient-to-b from-white/20 to-transparent transform scale-y-[-1] opacity-30 mask-image-linear-to-b">
                           {book.coverImageUrl && <img src={book.coverImageUrl} alt="Reflejo Portada" className="w-full h-full object-cover blur-sm" />}
                      </div>
                 </div>

                 {/* Digital Badge */}
                 <div className="absolute top-0 right-[-20px] bg-yellow-400 text-black font-black text-xs px-3 py-1 rounded shadow-lg transform rotate-12">
                     MEGA PACK
                 </div>
            </div>

            <div className="absolute bottom-6 left-0 right-0 text-center">
                 <span className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] group-hover:text-white transition-colors">Pack Promocional Completo</span>
            </div>
        </div>

    </div>
  )
}




function DevicePreview({ book }: { book: Book }) {
   const [device, setDevice] = useState<'kindle' | 'phone' | 'tablet' | 'laptop'>('kindle')

   return (
      <div className="grid lg:grid-cols-12 gap-8">
          {/* Controls */}
          <div className="lg:col-span-3 space-y-2">
              <button 
                  onClick={() => setDevice('kindle')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${device === 'kindle' ? 'bg-black text-white border-black shadow-lg ring-2 ring-black/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                  <BookOpen className="w-4 h-4" /> Kindle Paperwhite
              </button>
              <button 
                  onClick={() => setDevice('phone')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${device === 'phone' ? 'bg-black text-white border-black shadow-lg ring-2 ring-black/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                  <Zap className="w-4 h-4" /> Smartphone App
              </button>
              <button 
                  onClick={() => setDevice('tablet')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${device === 'tablet' ? 'bg-black text-white border-black shadow-lg ring-2 ring-black/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                  <Grid3X3 className="w-4 h-4" /> Tablet Reader
              </button>
               <button 
                  onClick={() => setDevice('laptop')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${device === 'laptop' ? 'bg-black text-white border-black shadow-lg ring-2 ring-black/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                  <Monitor className="w-4 h-4" /> Laptop Web Reader
              </button>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-9 bg-gray-100 rounded-2xl flex items-center justify-center p-12 min-h-[600px] border border-gray-200 overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-70"></div>
              
              {/* KINDLE MOCKUP */}
              {device === 'kindle' && (
                  <div className="relative w-[300px] h-[440px] bg-[#1a1a1a] rounded-[24px] p-4 shadow-2xl border-4 border-[#2a2a2a] flex flex-col ring-1 ring-white/10 animate-in zoom-in duration-300">
                      <div className="h-full bg-[#f5f4e9] rounded-[4px] overflow-hidden grayscale relative group shadow-inner">
                          {/* Screen Content */}
                          <div className="p-6 h-full flex flex-col">
                             <div className="flex justify-between text-[8px] text-gray-500 font-serif mb-4">
                                <span>{book.title.substring(0, 15)}...</span>
                                <span>Cap. 1</span>
                             </div>
                             <div className="flex-1 flex flex-col items-center justify-center text-center">
                                {book.coverImageUrl && <img src={book.coverImageUrl} alt="Portada Kindle" className="w-32 h-48 object-cover shadow-lg mb-4 mix-blend-multiply border border-black/10" />}
                                <h2 className="font-serif font-bold text-lg leading-tight mb-2 text-black">{book.title}</h2>
                                <p className="font-serif text-[10px] italic text-gray-800">{book.genre}</p>
                             </div>
                             <div className="text-[9px] text-gray-500 font-serif text-center mt-auto">Loc 345 • 45%</div>
                          </div>
                          {/* Glare definition for realism */}
                          <div className="absolute top-0 right-0 w-full h-[200px] bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                      </div>
                      <div className="h-8 flex items-center justify-center">
                         <span className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Kindle</span>
                      </div>
                  </div>
              )}

              {/* PHONE MOCKUP */}
              {device === 'phone' && (
                  <div className="relative w-[280px] h-[580px] bg-black rounded-[40px] shadow-2xl border-[6px] border-[#333] ring-1 ring-white/10 overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
                      <div className="absolute top-0 w-full h-full bg-white flex flex-col">
                          {/* Notch */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-black rounded-b-[16px] z-20"></div>
                          
                          {/* App Header */}
                          <div className="pt-10 pb-4 px-6 bg-white/90 backdrop-blur border-b flex justify-between items-center z-10 sticky top-0">
                              <ArrowLeft className="w-4 h-4 text-gray-800" />
                              <span className="text-xs font-bold uppercase tracking-wider">Nexbook</span>
                              <Share2 className="w-4 h-4 text-gray-800" />
                          </div>

                          {/* App Content */}
                          <div className="flex-1 overflow-y-auto no-scrollbar bg-white relative pb-8">
                              <div className="h-[300px] w-full relative">
                                 {book.coverImageUrl ? <img src={book.coverImageUrl} alt="Portada App Móvil" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-blue-100"/>}
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6">
                                     <h1 className="text-2xl font-bold text-white leading-tight drop-shadow-md">{book.title}</h1>
                                 </div>
                              </div>
                              <div className="p-6 space-y-4">
                                  <div className="flex items-center gap-2">
                                     <Badge className="bg-blue-600 text-xs shadow-sm shadow-blue-200">Best Seller</Badge>
                                     <span className="text-xs text-gray-500 font-medium">4.9 ★★★★★ (2.4k)</span>
                                  </div>
                                  <Button className="w-full rounded-full bg-black text-white text-xs h-10 font-bold shadow-lg shadow-black/20">Leer Gratis</Button>
                                  <p className="text-xs text-gray-600 leading-relaxed text-justify">
                                      {book.description || "Descubre una historia fascinante..."}
                                  </p>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
        
               {/* TABLET MOCKUP */}
              {device === 'tablet' && (
                  <div className="relative w-[500px] h-[360px] bg-black rounded-[24px] shadow-2xl border-[12px] border-black ring-1 ring-gray-800 flex overflow-hidden animate-in zoom-in-95 duration-300">
                      <div className="flex-1 bg-white flex">
                           {/* Sidebar */}
                           <div className="w-[160px] bg-gray-50 border-r p-4 hidden sm:block">
                               <div className="w-8 h-8 bg-purple-600 rounded-lg mb-6 shadow-md shadow-purple-200"></div>
                               <div className="space-y-4">
                                   <div className="h-2 w-20 bg-gray-200 rounded animate-pulse"></div>
                                   <div className="h-2 w-16 bg-gray-200 rounded"></div>
                                   <div className="h-2 w-24 bg-gray-200 rounded"></div>
                               </div>
                           </div>
                           {/* Content */}
                           <div className="flex-1 p-6 flex flex-col overflow-hidden">
                                <h1 className="text-2xl font-black mb-4 text-gray-900">{book.title}</h1>
                                <div className="flex gap-4">
                                    <div className="w-32 aspect-[2/3] relative flex-shrink-0 shadow-xl transform -rotate-2 border border-gray-100 bg-white p-1">
                                        {book.coverImageUrl && <img src={book.coverImageUrl} alt="Portada Tablet" className="w-full h-full object-cover rounded-sm" />}
                                    </div>
                                    <div className="flex-1 space-y-3 pt-2">
                                        <div className="h-2 w-full bg-gray-100 rounded"></div>
                                        <div className="h-2 w-full bg-gray-100 rounded"></div>
                                        <div className="h-2 w-3/4 bg-gray-100 rounded"></div>
                                        <Button size="sm" className="mt-4 bg-black text-white hover:bg-gray-800 rounded-full text-xs box-content px-4">Comprar Ahora</Button>
                                    </div>
                                </div>
                           </div>
                      </div>
                  </div>
              )}

              {/* LAPTOP MOCKUP */}
              {device === 'laptop' && (
                 <div className="relative w-[600px] aspect-[16/10] animate-in slide-in-from-bottom-5 duration-300">
                     {/* Lid */}
                     <div className="absolute inset-0 bg-[#1a1a1a] rounded-t-xl border-[8px] border-[#222] shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5">
                         {/* Screen */}
                         <div className="flex-1 bg-white relative overflow-hidden flex flex-col">
                             {/* Browser Bar */}
                             <div className="h-6 bg-gray-100 border-b flex items-center px-3 gap-1.5">
                                 <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                 <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                 <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                 <div className="ml-4 flex-1 h-4 bg-white rounded flex items-center px-2 shadow-sm">
                                     <span className="text-[6px] text-gray-400">nexbook.app/reader/preview</span>
                                 </div>
                             </div>
                             {/* Web Reader UI */}
                             <div className="flex-1 flex bg-white font-sans text-gray-800">
                                  <div className="w-[200px] border-r border-gray-100 p-6 flex flex-col items-center justify-center bg-gray-50/50">
                                      {book.coverImageUrl && <img src={book.coverImageUrl} alt="Portada Laptop" className="w-32 shadow-2xl rounded-sm mb-4 transform hover:scale-105 transition-transform duration-500" />}
                                  </div>
                                  <div className="flex-1 p-8 overflow-y-auto">
                                      <h1 className="text-3xl font-bold mb-6 text-gray-900">{book.title}</h1>
                                      <p className="text-sm leading-8 text-gray-600 font-serif text-justify max-w-lg">
                                          {book.description}
                                          <br/><br/>
                                          <span className="opacity-50 blur-[2px] select-none">
                                              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                                          </span>
                                      </p>
                                  </div>
                             </div>
                         </div>
                     </div>
                     {/* Base */}
                     <div className="absolute -bottom-4 left-0 right-0 h-4 bg-[#e2e2e2] rounded-b-xl shadow-xl transform scale-x-[1.1] z-[-1] flex justify-center border-t border-gray-300">
                         <div className="w-32 h-2 bg-[#d1d1d1] rounded-b-md mt-0"></div>
                     </div>
                 </div>
              )}
          </div>
      </div>
   )
}
