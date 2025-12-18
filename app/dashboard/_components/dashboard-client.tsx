'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Plus, LogOut, Trash2, Settings, Rocket, Sparkles, TrendingUp, Brain, Loader2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { UpgradeModal } from '@/components/upgrade-modal'

type Book = {
  id: string
  title: string
  genre: string
  description: string
  coverImageUrl: string | null
  status: string
  createdAt: Date
  chapters: any[]
}

type DashboardClientProps = {
  books: Book[]
  user: any
}

const GeneratingBookOverlay = ({ book, onDelete }: { book: any, onDelete: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [progress, setProgress] = useState(0)
  const [timeLeft, setTimeLeft] = useState<string>('Calculando...')
  const [quote, setQuote] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let w = canvas.width = canvas.parentElement?.clientWidth || 300
    let h = canvas.height = canvas.parentElement?.clientHeight || 400
    
    // "Cotton Candy" Particles
    const particles: any[] = []
    const particleCount = 60
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({ 
            x: Math.random() * w, 
            y: Math.random() * h, 
            vx: (Math.random() - 0.5) * 0.5, 
            vy: (Math.random() - 0.5) * 0.5, 
            size: Math.random() * 3 + 1,
            color: `hsl(${Math.random() * 60 + 200}, 100%, 70%)` // Blue-Cyan-Purple nuances
        })
    }
    
    let mouse = { x: w/2, y: h/2, active: false }
    let angle = 0; 
    let gatheredCount = 0;
    let dispersing = false;
    
    const handleMouseMove = (e: MouseEvent) => { 
        const rect = canvas.getBoundingClientRect(); 
        mouse.x = e.clientX - rect.left; 
        mouse.y = e.clientY - rect.top; 
        if (!dispersing) mouse.active = true;
    }

    const handleMouseLeave = () => { 
        mouse.active = false; 
        dispersing = true;
        setTimeout(() => dispersing = false, 1000); // Reset after fall
    }
    
    const handleClick = () => {
        mouse.active = false;
        dispersing = true;
        setTimeout(() => dispersing = false, 1000);
    }
    
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    canvas.addEventListener('click', handleClick)
    
    const animate = () => {
        if (!ctx) return
        ctx.clearRect(0, 0, w, h)
        
        // Spin speed increases with gathered particles
        const speed = 0.02 + (gatheredCount * 0.001); // Slower spin
        angle += speed;
        gatheredCount = 0; // Reset count for this frame recalculation

        // --- 1. DRAW MOUSE "CORE" (The Stick) ---
        if (mouse.active && !dispersing) {
            // Core Glow
            const coreSize = 6; // Smaller core as requested
            const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 2, mouse.x, mouse.y, coreSize * 4);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            gradient.addColorStop(0.4, 'rgba(56, 189, 248, 0.6)'); 
            gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, coreSize * 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Solid Center
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- 2. PARTICLE PHYSICS ---
        particles.forEach((p, i) => {
            // GRAVITY FALL (Dispersing)
            if (dispersing) {
                p.vy += 0.5; // Gravity
                p.y += p.vy;
                p.x += p.vx * 0.5;
                
                // Bounce floor slightly or reset top
                if (p.y > h) {
                    p.y = -10;
                    p.vy = 0;
                    p.x = Math.random() * w;
                }
            } 
            // NORMAL ATTRACTION
            else if (mouse.active) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < 150) {
                    // It's caught in the machine!
                    gatheredCount++;
                    
                    // Orbit Calculation
                    // Pull hard to center
                    const pull = (dist - 10) * 0.02; // Reduced pull
                    p.vx += (dx / dist) * pull * 0.5;
                    p.vy += (dy / dist) * pull * 0.5;
                    
                    // Add strong rotation (Tangent force)
                    // Cross product logic for 2D rotation
                    p.vx += -dy * 0.02; // Reduced rotation force
                    p.vy += dx * 0.02;
                    
                    // Dampen to keep stable orbit
                    p.vx *= 0.85; // Less damping to keep them moving but controlled
                    p.vy *= 0.85;
                    
                    p.x += p.vx;
                    p.y += p.vy;
                } else {
                    // Drifting slowly towards mouse if far
                    p.vx += (dx / dist) * 0.05; // Slower drift
                    p.vy += (dy / dist) * 0.05;
                    p.vx *= 0.95; p.vy *= 0.95;
                    p.x += p.vx; p.y += p.vy;
                }
            } else {
                // Idle floating
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
            }
            
            // Draw Particle
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw Web Connections (The "Cotton Candy" strands)
            if (mouse.active && !dispersing) {
                const distToMouse = Math.sqrt(Math.pow(p.x - mouse.x, 2) + Math.pow(p.y - mouse.y, 2));
                if (distToMouse < 80) {
                     particles.slice(i + 1).forEach(p2 => {
                        const d2 = Math.sqrt(Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2));
                        if (d2 < 40) {
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 - d2/80})`; 
                            ctx.lineWidth = 0.5;
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                     });
                     
                     // Strand to Core
                     ctx.beginPath();
                     ctx.strokeStyle = `rgba(147, 197, 253, ${0.4 - distToMouse/200})`;
                     ctx.lineWidth = 0.5;
                     ctx.moveTo(p.x, p.y);
                     ctx.lineTo(mouse.x, mouse.y);
                     ctx.stroke();
                }
            }
        })
        requestAnimationFrame(animate)
    }
    
    const animationId = requestAnimationFrame(animate)
    
    const resizeObserver = new ResizeObserver(() => {
        if (!canvas.parentElement) return
        w = canvas.width = canvas.parentElement.clientWidth
        h = canvas.height = canvas.parentElement.clientHeight
    })
    resizeObserver.observe(canvas.parentElement!)

    return () => { 
        cancelAnimationFrame(animationId); 
        canvas.removeEventListener('mousemove', handleMouseMove)
        canvas.removeEventListener('mouseleave', handleMouseLeave)
        canvas.removeEventListener('click', handleClick)
        resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
      const quotes = [
          "El Oráculo está pensando...", 
          "Los agentes están debatiendo...", 
          "El Cronista escribe...", 
          "El Visionario ilustra...", 
          "Optimizando ventas...", 
          "Analizando tendencias..."
      ]
      setQuote(quotes[Math.floor(Math.random() * quotes.length)])
      const i = setInterval(() => setQuote(quotes[Math.floor(Math.random() * quotes.length)]), 5000)
      
      const update = () => {
          const elapsed = Date.now() - new Date(book.createdAt).getTime()
          const total = 15 * 60 * 1000 // 15 mins
          const p = Math.min((elapsed / total) * 100, 99)
          setProgress(p)
          
          const remaining = Math.max(0, total - elapsed)
          const mins = Math.ceil(remaining / 60000)
          setTimeLeft(`${mins} min restantes`)
      }
      
      update(); 
      const pI = setInterval(update, 1000)
      
      return () => { clearInterval(i); clearInterval(pI) }
  }, [book.createdAt])

  return (
      <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-between p-6 overflow-hidden animate-in fade-in duration-500">
<canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-none opacity-100 pointer-events-auto" />
          
          <div className="absolute top-2 right-2 z-50">
             <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-slate-100/50 rounded-full"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Cancelar generación"
             >
                <Trash2 className="h-4 w-4" />
             </Button>
          </div>

          <div className="relative z-10 w-full flex flex-col items-center mt-10">
              <div className="relative mb-6"> 
                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20 duration-1000"></div> 
                <div className="relative p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-2xl"> 
                    <Loader2 className="h-10 w-10 text-white animate-spin" /> 
                </div> 
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-2 animate-pulse">{timeLeft}</h3>
              <p className="text-sm text-slate-500 font-medium text-center h-10 px-4">"{quote}"</p>
          </div>
          
          <div className="relative z-10 w-full space-y-2 mb-4">
               <div className="flex justify-between text-xs font-bold text-slate-600 uppercase tracking-wider"> 
                    <span>Generando Obra Maestra</span> 
                    <span>{Math.round(progress)}%</span> 
               </div>
               <Progress value={progress} className="h-3 w-full bg-slate-100 border border-slate-200" indicatorClassName="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
               <div className="text-[10px] text-center text-slate-400 pt-2"> Interactúa con las partículas ✨ </div>
          </div>
      </div>
  )
}

export function DashboardClient({ books, user }: DashboardClientProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [autopilotLoading, setAutopilotLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [language, setLanguage] = useState('es')
  const [topicSuggestion, setTopicSuggestion] = useState('')
  const [coverStyle, setCoverStyle] = useState('modern_light')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  
  // Countdown Timer Logic
  useEffect(() => {
    const interval = setInterval(() => {
        setTimeLeft((prev) => (prev && prev > 0 ? prev - 1 : prev))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Poll for status updates if any book is generating
  useEffect(() => {
    const hasGeneratingBook = books.some(b => b.status === 'generating')
    if (hasGeneratingBook) {
        const pollInterval = setInterval(() => {
            console.log('Refreshing to check generation status...')
            router.refresh()
        }, 10000) // Refresh every 10s
        return () => clearInterval(pollInterval)
    }
  }, [books, router])
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('¿Estás seguro de eliminar este libro?')) return

    setDeleting(bookId)
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete book')

      toast.success('Libro eliminado exitosamente')
      router.refresh()
    } catch (error) {
      toast.error('Error al eliminar libro')
    } finally {
      setDeleting(null)
    }
  }

  const handleAutopilot = async () => {
    setAutopilotLoading(true)
    setProgress(0)
    setStatusMessage('Iniciando autoresonador cuántico...')
    setTimeLeft(null)


    try {
      const response = await fetch('/api/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, topicSuggestion, coverStyle })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Autopilot failed')
      }

      if (!response.body) throw new Error('No readable stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let buffer = ''

      while (!done) {
        const { value, done: isDone } = await reader.read()
        done = isDone
        
        if (value) {
            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk
            
            const lines = buffer.split('\n')
            // Apply all complete lines, keep the last one in buffer if incomplete
            buffer = lines.pop() || '' 
            
            for (const line of lines) {
                if (!line.trim()) continue
                try {
                    const data = JSON.parse(line)
                    if (data.type === 'progress') {
                        setProgress(data.progress)
                        setStatusMessage(data.step)
                        
                        // Parse estimación de tiempo
                        if (data.step.includes('Tiempo estimado') && !timeLeft) {
                            const match = data.step.match(/~(\d+) minutos/)
                            if (match) {
                                setTimeLeft(parseInt(match[1]) * 60)
                            }
                        }
                    } else if (data.type === 'done') {
                        toast.success('✨ ¡Libro creado exitosamente!')
                        router.push(`/books/${data.bookId}`)
                        break
                    } else if (data.type === 'error') {
                        console.error('Autopilot Server Error:', data.message)
                        throw new Error(data.message)
                    }
                } catch (e: any) {
                    // Ignore transient JSON parse errors from stream chunks
                    if (e.message && e.message !== 'Unexpected end of JSON input') {
                         console.warn('Stream parsing warning:', e.message)
                    }
                }
            }
        }
      }

    } catch (error: any) {
      console.error('Autopilot error:', error)
      toast.error(error.message || 'Error en Autopilot', { id: 'autopilot' })
      setAutopilotLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Nexbook-AI
            </span>
            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">v7.0-ULTRA</span>
          </Link>
          <div className="flex items-center gap-4">
            <div 
                className="hidden md:flex items-center gap-3 mr-4 bg-white/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-full pl-5 pr-1.5 py-1.5 shadow-sm hover:shadow-md hover:border-violet-200 transition-all cursor-pointer group"
                onClick={() => setShowUpgradeModal(true)}
            >
                <div className="flex flex-col items-start leading-none gap-1 py-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        {user?.planType === 'pro' ? (
                             <><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>PRO</>
                        ) : user?.planType === 'indie' ? (
                             <><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>INDIE</>
                        ) : (
                             <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>FREE</>
                        )}
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Zap className={`w-3.5 h-3.5 ${user?.credits > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                        {user?.credits ?? 0} <span className="font-normal text-slate-500 text-xs">créditos</span>
                    </span>
                </div>
                
                {user?.planType === 'free' ? (
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-md group-hover:scale-105 transition-transform ml-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        Mejorar
                    </div>
                ) : (
                     <div className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold px-3 py-2 rounded-full ml-2 group-hover:bg-slate-200 transition-colors">
                        Gestionar
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:inline">{user?.name}</span>
                <Link href="/settings">
                <Button variant="ghost" size="icon" title="Configuración">
                    <Settings className="h-5 w-5" />
                </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/' })} title="Cerrar sesión">
                <LogOut className="h-5 w-5" />
                </Button>
            </div>
          </div>
        </div>
      </header>

      {/* UPGRADE BANNER FOR FREE USERS */}
      {user?.planType === 'free' && (
        <div 
            className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 text-white p-3 cursor-pointer hover:opacity-95 transition-all shadow-lg relative overflow-hidden group" 
            onClick={() => setShowUpgradeModal(true)}
        >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="container mx-auto max-w-7xl flex items-center justify-center gap-3 relative z-10 flex-wrap text-center">
                <div className="bg-white/20 p-1.5 rounded-full animate-pulse">
                    <Sparkles className="h-5 w-5 text-yellow-300"/>
                </div>
                <span className="font-bold text-sm md:text-lg tracking-wide drop-shadow-md">
                    ¡OFERTA LIMITADA! DESBLOQUEA PODERES ILIMITADOS DE IA
                </span>
                <Button size="sm" className="font-bold text-violet-700 bg-white hover:bg-gray-100 ml-2 md:ml-4 shadow-xl border-2 border-transparent hover:border-violet-200">
                    ACTIVAR PREMIUM AHORA
                </Button>
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-4 py-8">
        {/* Autopilot Banner */}
        <Card className="mb-8 border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl">
                    <Rocket className="w-12 h-12 text-white" />
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-emerald-900 mb-2 flex items-center justify-center md:justify-start gap-2">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                  Modo Autopilot - Generación Automática
                </h2>
                <p className="text-emerald-800 mb-3 text-justify">
                  Deja que la IA analice tendencias del mercado, redes sociales y demanda comercial para crear automáticamente un ebook optimizado para ventas máximas. Utiliza tus modelos configurados (OpenAI, Gemini, Anthropic, etc.) en modo cascada para máxima fiabilidad.
                </p>
                
                {/* Progress Bar UI */}
                {autopilotLoading ? (
                  <div className="mb-4 space-y-2">
                     <div className="flex justify-between text-sm text-emerald-800 font-medium">
                        <span>{statusMessage}</span>
                        <span>{Math.round(progress)}%</span>
                     </div>
                     <Progress value={progress} className="h-4 w-full bg-emerald-100" />
                     {timeLeft !== null && timeLeft > 0 && (
                        <div className="flex items-center justify-end gap-2 text-xs font-bold text-emerald-700 animate-pulse">
                            <span>Tiempo restante estimado:</span>
                            <span className="bg-emerald-200 px-2 py-0.5 rounded-full">
                                ~{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} min
                            </span>
                        </div>
                     )}
                  </div>
                ) : (
                <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-700 text-justify">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>Análisis de mercado</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Brain className="w-4 h-4" />
                    <span>Identificación de tendencias</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>Generación completa</span>
                  </div>
                </div>
                )}
              </div>
                <div className="flex flex-col gap-4">
                  <div className="w-full">
                     <label className="block text-sm font-medium text-emerald-800 mb-1">Idioma del Libro</label>
                     <select 
                        value={language}
                        aria-label="Seleccionar idioma del libro"
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-2 bg-white border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-emerald-900"
                        disabled={autopilotLoading}
                     >
                        <option value="es">🇪🇸 Español</option>
                        <option value="en">🇬🇧 English</option>
                        <option value="fr">🇫🇷 Français</option>
                        <option value="de">🇩🇪 Deutsch</option>
                        <option value="pt">🇵🇹 Português</option>
                        <option value="it">🇮🇹 Italiano</option>
                     </select>
                  </div>

                   {/* TOPIC SUGGESTIONS - v2.5 NEW FEATURE */}
                   <div className="w-full">
                      <label className="block text-sm font-medium text-emerald-800 mb-1">💡 Sugerencias de Tema (Opcional)</label>
                      <input
                        type="text"
                        value={topicSuggestion}
                        onChange={(e) => setTopicSuggestion(e.target.value)}
                        placeholder="ej: cocina, recetas veganas, cuentos infantiles, negocios..."
                        className="w-full px-4 py-2 bg-white border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400"
                        disabled={autopilotLoading}
                      />
                      <p className="text-xs text-emerald-700 mt-1">✨ Deja en blanco para análisis automático completo o especifica un tema de interés</p>
                   </div>
                   
                   {/* COVER STYLE SELECTOR */}
                   <div className="w-full">
                      <label className="block text-sm font-medium text-emerald-800 mb-1">🎨 Estilo de Portada</label>
                      <select 
                        value={coverStyle}
                        onChange={(e) => setCoverStyle(e.target.value)}
                        className="w-full px-4 py-2 bg-white border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-emerald-900"
                        disabled={autopilotLoading}
                      >
                        <option value="modern_light">Minimalista Moderno</option>
                        <option value="technical">Técnico / Blueprint</option>
                        <option value="cookbook">Gastronómico / Rustico</option>
                        <option value="cinematic">Cinematográfico</option>
                        <option value="fantasy">Fantasía / Mágico</option>
                      </select>
                   </div>

                   <Button
                      onClick={handleAutopilot}
                      disabled={autopilotLoading || (user?.credits ?? 0) <= 0}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-lg py-6 rounded-xl shadow-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      {autopilotLoading ? (
                        <>
                          <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                          Generando Libro...
                        </>
                      ) : (user?.credits ?? 0) <= 0 ? (
                        <>
                           <Rocket className="mr-3 h-6 w-6" />
                           Sin Créditos (Actualizar Plan)
                        </>
                      ) : (
                        <>
                          <Rocket className="mr-3 h-6 w-6" />
                          Activar Autopilot (1 Crédito)
                        </>
                      )}
                   </Button>
                </div>
              </div>

          </CardContent>
        </Card>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Mis Libros</h1>
            <p className="text-gray-600">Administra tus ebooks generados con IA</p>
          </div>
          <Link href="/generator">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="mr-2 h-5 w-5" />
              Crear Libro Manual
            </Button>
          </Link>
        </div>

        {/* Books Grid */}
        {books?.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tienes libros aún</h3>
            <p className="text-gray-600 mb-6">Usa el Autopilot para generar automáticamente tu primer ebook optimizado para ventas</p>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={handleAutopilot}
                disabled={autopilotLoading}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                <Rocket className="mr-2 h-5 w-5" />
                Usar Autopilot
              </Button>
              <Link href="/generator">
                <Button variant="outline">
                  <Plus className="mr-2 h-5 w-5" />
                  Crear Manual
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books?.map((book) => (
              <div
                key={book.id}
                className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden group relative ${book.status === 'generating' ? 'ring-2 ring-blue-400 cursor-not-allowed' : ''}`}
              >
                {/* Generating Overlay */}
                {book.status === 'generating' && <GeneratingBookOverlay book={book} onDelete={() => handleDeleteBook(book.id)} />}

                <Link href={book.status === 'generating' ? '#' : `/books/${book.id}`} className={book.status === 'generating' ? 'pointer-events-none' : ''}>
                  <div className="relative aspect-[3/4] bg-gray-200">
                    {book.coverImageUrl ? (
                      <Image
                        src={book.coverImageUrl}
                        alt={book.title}
                        fill
                        className={`object-cover ${book.status === 'generating' ? 'opacity-50 blur-sm' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1 line-clamp-1 text-gray-900">
                    {book.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{book.genre}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{book?.chapters?.length || 0} capítulos</span>
                    <span>{formatDistanceToNow(new Date(book.createdAt), { addSuffix: true, locale: es })}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                        className={`w-full ${book.status === 'generating' ? 'bg-gray-200 text-gray-400' : ''}`} 
                        size="sm" 
                        variant={book.status === 'generating' ? 'secondary' : 'outline'}
                        disabled={book.status === 'generating'}
                        onClick={() => book.status !== 'generating' && router.push(`/books/${book.id}`)}
                    >
                      {book.status === 'generating' ? 'Procesando...' : 'Ver Libro'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteBook(book.id)}
                      disabled={deleting === book.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {/* Upgrade Modal */}
      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} currentPlan={user?.planType || 'free'} />
    </div>
  )
}
