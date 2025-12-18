'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { BookOpen, ArrowLeft, ArrowUp, Download, Loader2, Palette, Save, RefreshCw, Sparkles, Copy, Bold, Italic, Underline, Type, Rocket, FileText, FileType, Layout, Columns, AlignJustify, AlignCenter, Grid, Maximize, Newspaper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { UpgradeModal } from '@/components/upgrade-modal'

// --- Interfaces ---
type Chapter = {
  id: string
  number: number
  title: string
  content: string
  imageUrl?: string | null
}

type Book = {
  id: string
  title: string
  genre: string
  description: string
  coverImageUrl: string | null
  status: string
  wordCount?: number | null
  createdAt: Date
  chapters: Chapter[]
  theme?: string | null
  layout?: string | null
}

type BookViewerClientProps = {
  book: Book
  planType?: string
}

type LayoutMode = 'standard' | 'magazine' | 'editorial' | 'newspaper' | 'cinematic' | 'cards' | 'academic' | 'draft'

// --- Theme Generator (EXPANDED) ---
// Base Colors
const colors = [
  { name: 'Azul', body: 'bg-blue-50', header: 'text-blue-900', accent: 'text-blue-600', border: 'border-blue-100', highlight: 'bg-blue-100' },
  { name: 'Púrpura', body: 'bg-purple-50', header: 'text-purple-900', accent: 'text-purple-600', border: 'border-purple-100', highlight: 'bg-purple-100' },
  { name: 'Esmeralda', body: 'bg-emerald-50', header: 'text-emerald-900', accent: 'text-emerald-600', border: 'border-emerald-100', highlight: 'bg-emerald-100' },
  { name: 'Ámbar', body: 'bg-amber-50', header: 'text-amber-900', accent: 'text-amber-600', border: 'border-amber-100', highlight: 'bg-amber-100' },
  { name: 'Gris', body: 'bg-gray-50', header: 'text-gray-900', accent: 'text-gray-600', border: 'border-gray-200', highlight: 'bg-gray-200' },
  { name: 'Noche', body: 'bg-slate-950', header: 'text-slate-100', accent: 'text-indigo-400', border: 'border-slate-800', highlight: 'bg-slate-900', dark: true },
  { name: 'Crema', body: 'bg-[#fcfbf9]', header: 'text-[#4a4036]', accent: 'text-[#8c735a]', border: 'border-[#edeae0]', highlight: 'bg-[#edeae0]' },
]

// Fonts
const fonts = [
  { id: 'sans', name: 'Moderno', class: 'font-sans' },
  { id: 'serif', name: 'Clásico', class: 'font-serif' },
  { id: 'mono', name: 'Técnico', class: 'font-mono' },
]

// Generate Basic Themes
const BOOK_THEMES: Record<string, any> = {}
colors.forEach(col => {
  fonts.forEach(font => {
     const key = `${col.name.toLowerCase()}_${font.id}`
     BOOK_THEMES[key] = {
        name: `${col.name} ${font.name}`,
        category: 'Básicos',
        bodyBg: col.body,
        chapterBg: col.dark ? 'bg-slate-900' : 'bg-white',
        chapterBorder: col.border,
        headerBg: col.dark ? 'bg-slate-900/50' : 'bg-white/50 backdrop-blur',
        headerText: col.header,
        textColor: col.dark ? 'text-slate-300' : 'text-slate-800',
        accentColor: col.accent,
        font: font.class,
        proseSize: 'prose-lg'
     }
  })
})

// --- CURATED SPECIAL THEMES (Expanded) ---
const CURATED_THEMES = {
    swiss_master: {
        name: '🔴 Swiss International', category: 'Premium',
        bodyBg: 'bg-white', chapterBg: 'bg-white', chapterBorder: 'border-red-600 border-l-8',
        headerText: 'text-black font-black tracking-tighter', textColor: 'text-black', accentColor: 'text-red-600', font: 'font-sans'
    },
    old_library: {
        name: '📜 Biblioteca Antigua', category: 'Premium',
        bodyBg: 'bg-[#e0d6c2]', chapterBg: 'bg-[#f0eadd] shadow-2xl ring-1 ring-[#c0b090]', chapterBorder: 'border-[#d4c5a0]',
        headerText: 'text-[#4a3b2a]', textColor: 'text-[#2e2417] leading-relaxed', accentColor: 'text-[#8b4513]', font: 'font-serif'
    },
    cyberpunk: {
        name: '🤖 Neon City', category: 'Premium',
        bodyBg: 'bg-[#050505]', chapterBg: 'bg-[#0a0a0a] border-2 border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.3)]', chapterBorder: 'border-[#00ff41]',
        headerText: 'text-[#00ff41] font-mono tracking-widest uppercase', textColor: 'text-[#e0e0e0]', accentColor: 'text-[#f0f]', font: 'font-mono'
    },
    vogue_fashion: {
        name: '👠 Vogue Editorial', category: 'Premium',
        bodyBg: 'bg-white', chapterBg: 'bg-white', chapterBorder: 'border-black border-4',
        headerBg: 'bg-black text-white', headerText: 'text-white font-serif italic', textColor: 'text-black font-light', accentColor: 'text-pink-500', font: 'font-serif'
    },
    nature_journal: {
        name: '🌿 Diario Botánico', category: 'Premium',
        bodyBg: 'bg-[#f3f7f0]', chapterBg: 'bg-white/80 backdrop-blur-sm border-2 border-green-800/10', chapterBorder: 'border-green-800/20',
        headerText: 'text-green-900 font-serif', textColor: 'text-green-950', accentColor: 'text-emerald-600', font: 'font-serif'
    },
    royal_gold: {
        name: '👑 Royal Gold', category: 'Premium',
        bodyBg: 'bg-[#0f172a]', chapterBg: 'bg-[#1e293b] border border-amber-500/30', border: 'border-amber-500',
        headerText: 'text-amber-400', textColor: 'text-amber-100', accentColor: 'text-amber-500', font: 'font-serif'
    },
    typewriter_noir: {
        name: '🕵️ Noir Detective', category: 'Premium',
        bodyBg: 'bg-[#d8d8d8]', chapterBg: 'bg-[#f0f0f0] shadow-xl', chapterBorder: 'border-gray-400',
        headerText: 'text-gray-900 uppercase tracking-widest', textColor: 'text-gray-800', accentColor: 'text-red-900', font: 'font-mono'
    },
    academic_paper: {
        name: '🎓 Paper Académico', category: 'Premium',
        bodyBg: 'bg-[#f5f5f5]', chapterBg: 'bg-white border-none shadow-none max-w-[210mm] mx-auto min-h-[297mm]', chapterBorder: 'border-gray-200',
        headerText: 'text-black font-bold', textColor: 'text-black text-justify', accentColor: 'text-blue-900', font: 'font-serif text-sm'
    }
}

Object.assign(BOOK_THEMES, CURATED_THEMES)

export function BookViewerClient({ book, planType = 'free' }: BookViewerClientProps) {
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Initialize from saved state or defaults
  const [selectedTheme, setSelectedTheme] = useState<string>(book.theme || 'swiss_master')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>((book.layout as LayoutMode) || 'standard')
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Scroll To Top Logic
  useEffect(() => {
    const handleScroll = () => {
        if (window.scrollY > 400) {
            setShowScrollTop(true)
        } else {
            setShowScrollTop(false)
        }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [regeneratingImageId, setRegeneratingImageId] = useState<string | null>(null)
  const [isRegeneratingCover, setIsRegeneratingCover] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isRewriting, setIsRewriting] = useState(false)
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const [showCoverModal, setShowCoverModal] = useState(false)
  const [currentCoverUrl, setCurrentCoverUrl] = useState(book.coverImageUrl)
  const [selectedCoverStyle, setSelectedCoverStyle] = useState('modern_light')
  const [isSaving, setIsSaving] = useState(false)

  // Sync state if prop changes
  useEffect(() => { setCurrentCoverUrl(book.coverImageUrl) }, [book.coverImageUrl])

  const theme = BOOK_THEMES[selectedTheme] || BOOK_THEMES['swiss_master']

  // Update theme handling to trigger save state
  const handleThemeChange = (val: string) => {
      setSelectedTheme(val)
      setHasUnsavedChanges(true)
  }

  const handleLayoutChange = (mode: LayoutMode) => {
      setLayoutMode(mode)
      setHasUnsavedChanges(true)
  }

  const handleSaveChanges = async () => {
      setIsSaving(true)
      try {
          const res = await fetch(`/api/books/${book.id}`, {
              method: 'PATCH',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                  theme: selectedTheme,
                  layout: layoutMode
              })
          })
          if (!res.ok) throw new Error('Failed to save')
          
          toast.success("Cambios guardados correctamente")
          setHasUnsavedChanges(false)
          router.refresh()
      } catch (e) {
          toast.error("Error guardando cambios")
      } finally {
          setIsSaving(false)
      }
  }

   // State for cover regen count (initialized from props or 0)
   const [coverRegenCount, setCoverRegenCount] = useState((book.coverRegenCount as number) || 0);

   const handleRegenerateCover = async () => {
      // Client-side quick check
      if (coverRegenCount >= 3) {
          toast.error("Límite alcanzado", { description: "Máximo 3 regeneraciones permitidas para la portada." });
          return;
      }

      setIsRegeneratingCover(true)
      try {
          const res = await fetch(`/api/books/${book.id}/regenerate-cover`, { 
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ action: 'regenerate', style: selectedCoverStyle }) 
             })
          
          let data;
          try { data = await res.json() } catch (err) { throw new Error(`Server Error: ${res.status}`) }
   
           if (data.imageUrl) {
               setCurrentCoverUrl(data.imageUrl)
               setCoverRegenCount(prev => prev + 1);
               toast.success("Portada regenerada con éxito", { description: `Via ${data.provider}` })
           } else if (data.error) {
               if (data.limitReached) setCoverRegenCount(3);

               console.error("[Cover Gen Error]:", data.details);
               const detailsStr = data.details ? data.details.join('\n') : '';
               
               // Smart User Message based on error type
               let userMsg = data.error;
               if (detailsStr.includes('429') || detailsStr.includes('quota')) {
                   userMsg = "Límite de cuota alcanzado. Espera unos minutos e intenta de nuevo.";
               } else if (detailsStr.includes('402') || detailsStr.includes('billing_hard_limit')) {
                   userMsg = "Tus llaves de AI (OpenAI/Replicate) no tienen saldo.";
               } else if (detailsStr.includes('No image')) {
                   userMsg = "El modelo no generó imagen. Intenta con otro prompt o espera unos minutos.";
               }
   
               toast.error("Error al generar portada", { 
                   description: userMsg,
                   duration: 8000,
                   action: userMsg.includes('Vertex AI') ? {
                       label: 'Abrir Consola',
                       onClick: () => window.open(data.details[1], '_blank')
                   } : undefined
               })
          }
      } catch (error: any) {
           console.error("❌ [CLIENT] Regenerate Cover Error:", error);
           toast.error("Error de conexión", { description: error.message });
       } finally {
           setIsRegeneratingCover(false)
       }
   }

  // Group themes by category with Premium first
  const themesByCategory = Object.entries(BOOK_THEMES).reduce((acc, [key, theme]) => {
    const cat = theme.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push({ key, theme })
    return acc
  }, {} as Record<string, Array<{ key: string; theme: any }>>)

  // Ensure Premium is at top of dropdown list visually by sorting keys
  const sortedCategories = Object.keys(themesByCategory).sort((a,b) => a === 'Premium' ? -1 : 1)

  // Manual Playback Control
  useEffect(() => {
    const hasPlaceholder = book.chapters.some(ch => ch.content.includes('⏳ Generando contenido') || ch.content.length < 50)
    setIsGenerating(hasPlaceholder)
    if (hasPlaceholder) {
      const interval = setInterval(() => router.refresh(), 8000) 
      return () => clearInterval(interval)
    }
  }, [book.chapters, router])

  const handleRewrite = async (text: string, range: Range) => {
      setIsRewriting(true)
      try {
          const response = await fetch('/api/generate/rewrite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, context: book.title + ' - ' + book.genre })
          })
          const data = await response.json()
          if (data.error) throw new Error(data.error)
          
          const parentNode = range.startContainer.parentNode; 
          range.deleteContents();
          range.insertNode(document.createTextNode(data.rewritten));
          toast.success("✨ Texto reescrito")
      } catch (error) {
          toast.error("Error al reescribir texto")
      } finally {
          setIsRewriting(false)
      }
  }

  return (
    <div className={`min-h-screen ${theme.bodyBg} transition-colors duration-500`}>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
          {showScrollTop && (
             <Button 
                onClick={scrollToTop}
                className="rounded-full w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white shadow-xl pointer-events-auto animate-in slide-in-from-bottom-5"
                size="icon"
             >
                <ArrowUp className="h-6 w-6" />
             </Button>
          )}

          {hasUnsavedChanges && (
             <div className="pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
                 <Button onClick={handleSaveChanges} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white shadow-xl ring-2 ring-green-200" size="lg">
                     {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                     {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                 </Button>
             </div>
          )}

          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-5 border border-slate-200/60 w-[380px] pointer-events-auto ring-1 ring-black/5 max-h-[80vh] overflow-y-auto">
              <div className="flex flex-col gap-6">
               
               {/* 1. SELECCION DE TEMA */}
               <div className="space-y-3">
                   <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                     <div className="bg-indigo-50 p-1.5 rounded-lg"><Palette className="h-4 w-4 text-indigo-600" /></div>
                     <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Estilo Visual</span>
                   </div>
                   
                   <Select value={selectedTheme} onValueChange={handleThemeChange}>
                     <SelectTrigger className="w-full h-10 text-xs font-medium bg-slate-50 border-slate-200"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                     <SelectContent className="max-h-[300px]">
                       {sortedCategories.map((category) => (
                         <div key={category}>
                           <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-50/50">{category}</div>
                           {themesByCategory[category].map(({ key, theme }) => (
                             <SelectItem key={key} value={key} className="text-xs font-medium cursor-pointer">
                                {category === 'Premium' ? '✨ ' : ''}{theme.name}
                             </SelectItem>
                           ))}
                         </div>
                       ))}
                     </SelectContent>
                   </Select>
               </div>

               {/* 2. DIAGRAMACIÓN (Layout Mode) - Collapsible */}
               <div className="space-y-3">
                   <button 
                      onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                      className="w-full flex items-center justify-between gap-3 border-b border-gray-100 pb-2 hover:bg-gray-50 transition-colors rounded-sm px-1"
                   >
                     <div className="flex items-center gap-3">
                        <div className="bg-pink-50 p-1.5 rounded-lg"><Layout className="h-4 w-4 text-pink-600" /></div>
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Diagramación</span>
                     </div>
                     <span className="text-xs text-gray-400">{showLayoutMenu ? 'Ocultar' : 'Mostrar'}</span>
                   </button>

                   {showLayoutMenu && (
                       <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                           <LayoutButton 
                              icon={AlignJustify} label="Estándar" active={layoutMode === 'standard'} 
                              onClick={() => handleLayoutChange('standard')} 
                           />
                           <LayoutButton 
                              icon={Columns} label="Revista (2 Col)" active={layoutMode === 'magazine'} 
                              onClick={() => handleLayoutChange('magazine')} 
                           />
                           <LayoutButton 
                              icon={Newspaper} label="Diario (3 Col)" active={layoutMode === 'newspaper'} 
                              onClick={() => handleLayoutChange('newspaper')} 
                           />
                           <LayoutButton 
                              icon={AlignCenter} label="Novela (Centrado)" active={layoutMode === 'editorial'} 
                              onClick={() => handleLayoutChange('editorial')} 
                           />
                            <LayoutButton 
                              icon={Maximize} label="Cinemático (Full)" active={layoutMode === 'cinematic'} 
                              onClick={() => handleLayoutChange('cinematic')} 
                           />
                           <LayoutButton 
                              icon={Grid} label="Tarjetas" active={layoutMode === 'cards'} 
                              onClick={() => handleLayoutChange('cards')} 
                           />
                           {/* New Layouts */}
                            <LayoutButton 
                              icon={FileType} label="Académico" active={layoutMode === 'academic'} 
                              onClick={() => handleLayoutChange('academic')} 
                           />
                           <LayoutButton 
                              icon={FileText} label="Borrador" active={layoutMode === 'draft'} 
                              onClick={() => handleLayoutChange('draft')} 
                           />
                       </div>
                   )}
               </div>
             </div>
          </div>
      </div>

      {/* Main Content */}
      <main className={`container mx-auto px-4 py-8 relative transition-all duration-500 
          ${layoutMode === 'editorial' ? 'max-w-3xl' : ''} 
          ${layoutMode === 'standard' ? 'max-w-5xl' : ''}
          ${layoutMode === 'cinematic' ? 'max-w-full px-8' : ''}
      `}>
        <Link href="/dashboard"><Button variant="ghost" className="mb-6 pl-0 text-slate-500 hover:bg-transparent hover:text-blue-600"><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button></Link>
        
        {/* --- COVER PREVIEW & REGENERATION MODAL --- */}
        {/* Needs Dialog Logic from 'shadcn/ui' but implementing as custom overlay for now to avoid dependency errors if Dialog not set up */}
        {showCoverModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                <div onClick={() => !isRegeneratingCover && setShowCoverModal(false)} className="absolute inset-0 cursor-pointer" />
                <div className="relative z-10 bg-white p-2 rounded-xl shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col items-center">
                    <div className="relative h-[70vh] aspect-[2/3] rounded-lg overflow-hidden bg-slate-100 shadow-inner">
                        {currentCoverUrl ? (
                            <img 
                                src={currentCoverUrl} 
                                alt="Cover Preview" 
                                className="w-full h-full object-cover"
                                style={{ display: 'block' }}
                            />
                        ) : (
                              <div className="flex flex-col items-center justify-center w-full h-full text-slate-300">
                                  <BookOpen className="w-24 h-24 mb-4" />
                                  <span>Sin Portada</span>
                              </div>
                          )}
                         
                         {/* Loading Overlay */}
                         {isRegeneratingCover && (
                             <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm animate-in fade-in">
                                 <Loader2 className="w-12 h-12 animate-spin mb-4 text-purple-400" />
                                 <p className="font-bold text-lg animate-pulse">Diseñando nueva portada...</p>
                                 <p className="text-sm opacity-70">Esto toma unos segundos</p>
                             </div>
                         )}
                    </div>

                    <div className="mt-4 w-full max-w-xs">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block text-center">Estilo de Fondo</label>
                        <Select value={selectedCoverStyle} onValueChange={setSelectedCoverStyle}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecciona un fondo" />
                            </SelectTrigger>
                            <SelectContent className="z-[200]">
                                <SelectItem value="modern_light">Moderno Claro (Genérico)</SelectItem>
                                <SelectItem value="studio_white">Estudio Fotográfico Blanco</SelectItem>
                                <SelectItem value="minimal_grey">Minimalista Gris Suave</SelectItem>
                                <SelectItem value="wooden_table">Mesa de Madera Clara</SelectItem>
                                <SelectItem value="soft_gradient">Gradiente Pastel Suave</SelectItem>
                                <SelectItem value="geometric_abstract">Abstracto Geométrico Claro</SelectItem>
                                <SelectItem value="natural_light">Luz Natural de Ventana</SelectItem>
                                <SelectItem value="clean_tech">Tech Limpio (Blanco/Azul)</SelectItem>
                                <SelectItem value="coffee_shop_blur">Cafetería Borrosa (Bokeh)</SelectItem>
                                <SelectItem value="marble_surface">Superficie de Mármol</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="mt-6 flex gap-4 w-full justify-center">
                        <Button 
                            variant="secondary"
                            size="lg"
                            onClick={handleRegenerateCover} 
                            disabled={isRegeneratingCover || coverRegenCount >= 3} 
                            className="bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200 shadow-sm min-w-[160px]"
                        >
                            <Sparkles className={`mr-2 h-4 w-4 ${isRegeneratingCover ? 'animate-spin' : ''}`} />
                            {isRegeneratingCover ? 'Generando...' : (coverRegenCount >= 3 ? 'Límite (3/3)' : `Re-Generar (${coverRegenCount}/3)`)}
                        </Button>

                        <Button 
                            variant="default" 
                            size="lg" 
                            onClick={() => setShowCoverModal(false)} 
                            disabled={isRegeneratingCover}
                            className="bg-slate-900 text-white hover:bg-slate-800 min-w-[160px] shadow-lg"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Guardar
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Header Block - Adapts to Cinema Mode */}
        {/* REFACTORED: Centered Layout Scheme as requested */}
        <div className={`${theme.chapterBg} rounded-2xl shadow-xl border ${theme.chapterBorder} overflow-hidden mb-12 p-8 md:p-16 transition-all duration-500 relative ${layoutMode === 'cinematic' ? 'max-w-screen-2xl mx-auto' : ''}`}>
               {/* Background Ambient Blur (Optional Polish) */}
               <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-${theme.accentColor?.split('-')[1] || 'gray'}-500 to-transparent opacity-20`}></div>
               
               <div className="flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">
                   
                   {/* Cover Image - Centered & Interactive */}
                   <div 
                        onClick={() => setShowCoverModal(true)}
                        className="w-[240px] aspect-[2/3] relative flex-shrink-0 rounded-lg shadow-2xl overflow-hidden group ring-4 ring-white/50 cursor-pointer transform hover:scale-[1.02] transition-all duration-300 bg-gray-200"
                   >
                       {currentCoverUrl ? (
                           <img 
                               src={currentCoverUrl} 
                               alt="Cover" 
                               className="w-full h-full object-cover" 
                           />
                       ) : (
                           <div className="bg-slate-100 w-full h-full flex items-center justify-center"><BookOpen className="text-slate-300 w-12 h-12" /></div>
                       )}
                       
                       {/* Hover Hint */}
                       <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                           <Maximize className="text-white w-8 h-8 drop-shadow-lg" />
                       </div>
                   </div>

                   {/* Title & Info - Centered */}
                   <div className="flex flex-col items-center">
                       <span className={`text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-1.5 border rounded-full ${theme.accentColor} border-current opacity-70 mb-6 bg-white/50 backdrop-blur-sm`}>
                            {book.genre || 'Género'}
                       </span>
                       
                       <h1 className={`text-5xl md:text-7xl font-black mb-6 ${theme.headerText} tracking-tight leading-[0.95] max-w-2xl`}>
                            {book.title}
                       </h1>
                       
                       <p className={`text-lg md:text-xl leading-relaxed max-w-2xl opacity-90 ${theme.textColor} mb-10 font-serif`}>
                            {book.description}
                       </p>
                       
                       <div className="flex items-center gap-4">
                            <Button 
                                onClick={() => setShowCoverModal(true)}
                                variant="outline" 
                                className="border-slate-300 hover:bg-slate-100 text-slate-700"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" /> Cambiar Portada
                            </Button>
                            
                            <Link href={`/books/${book?.id}/export`}>
                                <Button className="bg-slate-900 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all text-base px-8 py-6 h-auto">
                                    <Rocket className="mr-2 h-5 w-5" /> Exportar Libro
                                </Button>
                            </Link>
                       </div>
                   </div>
               </div>
        </div>

        {/* Chapters */}
        <div className={`space-y-16 pb-24 ${layoutMode === 'cards' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6 space-y-0' : ''}`}>
          {book?.chapters?.map((chapter) => (
             <ChapterRenderer 
                key={chapter.id} 
                chapter={chapter} 
                theme={theme} 
                layoutMode={layoutMode}
                regeneratingImageId={regeneratingImageId}
                setRegeneratingImageId={setRegeneratingImageId}
             />
          ))}
        </div>
        
        <SelectionMenu onRewrite={handleRewrite} isRewriting={isRewriting} />
        <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} currentPlan={planType} />
      </main>
    </div>
  )
}

// --- SUB-ELEMENTS ---

function LayoutButton({ icon: Icon, label, active, onClick }: any) {
    return (
        <button 
           onClick={onClick} 
           className={`p-2 rounded-lg border text-xs flex flex-col items-center justify-center gap-1.5 transition-all
              ${active 
                ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm ring-1 ring-blue-200' 
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }
           `}
        >
           <Icon className="w-5 h-5" />
           <span className="font-medium text-[10px]">{label}</span>
       </button>
    )
}

function SelectionMenu({ onRewrite, isRewriting }: { onRewrite: (text: string, range: Range) => void, isRewriting: boolean }) {
    const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
    const [selectionRange, setSelectionRange] = useState<Range | null>(null);
    const [selectedText, setSelectedText] = useState("");

    useEffect(() => {
        const handleSelection = () => {
            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                setPosition({ x: Math.max(10, Math.min(window.innerWidth - 150, rect.left + rect.width / 2)), y: Math.max(10, rect.top + window.scrollY - 10) });
                setSelectedText(selection.toString());
                setSelectionRange(range.cloneRange());
            } else {
                setTimeout(() => { if (document.getSelection()?.toString().length === 0) setPosition(null); }, 100);
            }
        };
        document.addEventListener('mouseup', handleSelection);
        return () => document.removeEventListener('mouseup', handleSelection);
    }, []);

    if (!position) return null;

    return (
        /* eslint-disable-next-line @next/next/no-img-element, react/style-prop-object */
        <div className="absolute z-50 flex items-center gap-1 bg-slate-900/90 backdrop-blur text-white p-1 rounded-full shadow-2xl scale-in-center animate-in fade-in zoom-in duration-150 border border-white/20" style={{ left: position.x, top: position.y, transform: 'translate(-50%, -100%)' }} onMouseDown={(e) => e.preventDefault()}>
            {isRewriting ? <div className="flex items-center gap-2 px-3 py-1 text-xs text-purple-300 font-medium"><Loader2 className="w-3 h-3 animate-spin" /><span>Magic...</span></div> : (
                <>
                    <button onClick={() => document.execCommand('bold')} aria-label="Negrita" className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"><Bold className="w-4 h-4" /></button>
                    <button onClick={() => document.execCommand('italic')} aria-label="Cursiva" className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"><Italic className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-white/20 mx-0.5"></div>
                    <button onClick={() => { if(selectionRange) onRewrite(selectedText, selectionRange) }} className="flex items-center gap-1 pl-2 pr-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-full text-xs font-bold transition-all shadow-lg active:scale-95"><Sparkles className="w-3 h-3" /> IA</button>
                </>
            )}
        </div>
    );
}

function ChapterRenderer({ chapter, theme, layoutMode, regeneratingImageId, setRegeneratingImageId }: any) {
    const [lines, setLines] = useState<string[]>(chapter.content.split('\n'))
    
    // Layout Logic Flags
    const isMagazine = layoutMode === 'magazine'
    const isNewspaper = layoutMode === 'newspaper'
    const isEditorial = layoutMode === 'editorial'
    const isCards = layoutMode === 'cards'
    const isCinematic = layoutMode === 'cinematic'
    const isAcademic = layoutMode === 'academic'
    const isDraft = layoutMode === 'draft'

    // Determine container classes based on layout
    let containerClass = `p-8 md:p-12 relative `
    if (isMagazine) containerClass += `md:columns-2 gap-12 text-justify`
    if (isNewspaper) containerClass += `md:columns-3 gap-8 text-justify text-sm`
    if (isEditorial) containerClass += `max-w-xl mx-auto text-lg leading-loose`
    if (isCinematic) containerClass += `max-w-4xl mx-auto text-xl leading-relaxed`
    if (isAcademic) containerClass += `max-w-3xl mx-auto text-base font-serif leading-7 border-l-4 border-gray-100 pl-8`
    if (isDraft) containerClass += `max-w-2xl mx-auto font-mono text-sm leading-relaxed bg-yellow-50/50 p-4 border border-dashed border-yellow-200`
    if (isCards) containerClass += `p-6` // Content inside card



    const [currentImageUrl, setCurrentImageUrl] = useState(chapter.imageUrl)
    const [selectedStyle, setSelectedStyle] = useState('cinematic');
    const [regenCount, setRegenCount] = useState(chapter.imageRegenCount || 0);

    const handleRegenerateImage = async () => {
         // Client-side quick check
         if (regenCount >= 3) {
             toast.error("Límite alcanzado", { description: "Máximo 3 regeneraciones permitidas." });
             return;
         }

         setRegeneratingImageId(chapter.id)
         try {
            const res = await fetch(`/api/chapters/${chapter.id}/regenerate-image`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ style: selectedStyle }) // Send Style
            })
            // Parse response regardless of status (e.g. 200 with error field, or 400/500 text)
            let data;
            try { 
                data = await res.json() 
            } catch (err) {
                 // Fallback if not JSON (e.g. 500 error page)
                 throw new Error(`Server Error: ${res.status} ${res.statusText}`);
            }

            if (data.imageUrl) { 
                setCurrentImageUrl(data.imageUrl); 
                setRegenCount(prev => prev + 1); // Client increment
                toast.success("Imagen regenerada", { description: `Via ${data.provider}` }) 
            } else if (data.error) {
                if (data.limitReached) {
                    setRegenCount(3); // Force update limit
                }
                console.error("[Regen Error Details]:", data.details);
                // Join details for the toast, or just show the first few
                const detailsStr = data.details ? data.details.join('\n') : '';
                toast.error("Fallo la regeneración", { 
                    description: `${data.error}\n${detailsStr}`,
                    duration: 10000 // Show longer so user can read
                });
            }
         } catch(e: any) { 
             console.error("Client Regen Error:", e);
             toast.error("Error de Sistema", { description: e.message });
         } finally {
             setRegeneratingImageId(null)
         }
    }

    const STYLES = [
        { id: 'cinematic', label: '🎥 Realista' },
        { id: 'comic', label: '💥 Cómic' },
        { id: 'anime', label: '🎌 Anime' },
        { id: 'fantasy', label: '🐉 Fantasía' },
        { id: 'watercolor', label: '🎨 Acuarela' },
        { id: 'cyberpunk', label: '🤖 Cyber' },
        { id: 'sketch', label: '✏️ Boceto' },
    ];

    return (
        <article className={`
            ${theme.chapterBg} rounded-xl shadow-sm border ${theme.chapterBorder} overflow-hidden transition-all duration-500
            ${isCards ? 'hover:-translate-y-1 hover:shadow-xl' : ''}
        `}>
               {/* Header Area */}
               {!isCards && (
                   <div className={`${theme.headerBg} px-8 py-8 flex flex-col items-start border-b ${theme.chapterBorder}`}>
                      <div className={`text-[10px] uppercase tracking-[0.2em] ${theme.accentColor} font-bold mb-3 opacity-60 flex items-center gap-2`}>
                          <span className="w-8 h-px bg-current"></span>
                          Capítulo {chapter.number}
                      </div>
                      <h2 className={`text-4xl md:text-5xl ${theme.font} font-bold ${theme.headerText} tracking-tight leading-[1] w-full`}>{chapter.title}</h2>
                   </div>
               )}
               
               {isCards && (
                   <div className={`${theme.headerBg} px-6 py-4 border-b ${theme.chapterBorder}`}>
                       <h2 className={`text-lg font-bold ${theme.headerText} truncate`}>{chapter.number}. {chapter.title}</h2>
                   </div>
               )}

               {/* Image - Adaptive Aspect Ratio */}
               {currentImageUrl && (
                <div className={`
                    relative w-full bg-gray-50 group overflow-hidden border-b ${theme.chapterBorder}
                    ${isMagazine ? 'aspect-[2.35/1]' : ''}
                    ${isNewspaper ? 'aspect-[3/1]' : ''}
                    ${isCards ? 'aspect-square' : ''}
                    ${(!isMagazine && !isNewspaper && !isCards) ? 'aspect-video' : ''}
                `}>
                  <Image src={currentImageUrl} alt="Chapter Art" fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  
                  {/* Style Selector Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm gap-4 p-4">
                       
                       <div className="flex flex-wrap justify-center gap-2 max-w-md">
                           {STYLES.map(s => (
                               <button 
                                key={s.id}
                                onClick={() => setSelectedStyle(s.id)}
                                className={`
                                    px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all
                                    ${selectedStyle === s.id 
                                        ? 'bg-white text-black shadow-lg scale-105' 
                                        : 'bg-black/40 text-white/70 hover:bg-white/20 hover:text-white border border-white/10'
                                    }
                                `}
                               >
                                {s.label}
                               </button>
                           ))}
                       </div>

                       <Button 
                          variant="secondary" 
                          onClick={handleRegenerateImage} 
                          disabled={regeneratingImageId === chapter.id || regenCount >= 3} 
                          className="shadow-2xl h-9 px-6 font-bold tracking-wide"
                       >
                          <RefreshCw className={`mr-2 h-4 w-4 ${regeneratingImageId === chapter.id ? 'animate-spin' : ''}`}/> 
                          {regeneratingImageId === chapter.id 
                            ? 'Creando Arte...' 
                            : (regenCount >= 3 ? 'Límite (3/3) Pasado' : `Regenerar Arte (${regenCount}/3)`)}
                       </Button>
                  </div>
                </div>
               )}

               {/* Content Area */}
               <div className={containerClass + " text-justify"}>
                   <div className={`prose ${theme.proseSize || 'prose-lg'} max-w-none ${theme.textColor} ${theme.font} text-justify`}>
                       {lines.map((line: string, idx: number) => {
                           // Clean Text Function inside render
                           const cleanLine = line.replace(/\*\*/g, '').replace(/###/g, '').replace(/^#+\s/, '');
                           
                           // Clean H2/H3 detected manually or by markdown structure
                           if (line.startsWith('## ') || line.startsWith('### ')) {
                               return <h3 key={idx} className={`text-2xl font-bold mt-8 mb-4 ${theme.headerText} break-inside-avoid-column border-b border-gray-100 pb-2`}>{cleanLine}</h3>
                           }

                           // Dropcap Logic (Only for first para in fancy layouts)
                           if (cleanLine.trim().length > 0 && idx === 0 && (isMagazine || isNewspaper || isEditorial)) {
                               return (
                                   <div key={idx} className={`mb-6 first-letter:float-left first-letter:text-6xl first-letter:pr-3 first-letter:font-black first-letter:text-current first-letter:opacity-50 first-letter:leading-[0.8] text-justify`}>
                                       {cleanLine}
                                   </div>
                               )
                           }
                           
                           if(cleanLine.trim() === '') return <br key={idx} />

                           return (
                               <div key={idx} className="mb-4 outline-none empty:hidden text-justify w-full" contentEditable suppressContentEditableWarning>
                                  {cleanLine}
                               </div>
                           )
                       })}
                   </div>
               </div>
        </article>
    )
}
