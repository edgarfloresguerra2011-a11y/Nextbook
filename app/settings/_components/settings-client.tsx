'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Key, 
  Save, 
  Trash2, 
  Eye, 
  EyeOff, 
  Plus,
  Zap,
  FileText,
  Image,
  CheckCircle,
  Sparkles,
  TrendingUp,
  Brain,
  Rocket,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowLeft,
  BookOpen,
  Twitter,
  Instagram,
  Linkedin,
  Globe,
  Link as LinkIcon,
  Camera,
  Upload,
  X,
  Facebook,
  Music2
} from 'lucide-react'
import { useRef, useEffect } from 'react'
import { AI_PROVIDERS, AIProvider, AIModel, CATEGORIES } from '@/lib/ai-providers-data'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { LanguageSwitcher } from '@/components/language-switcher'

interface Provider {
  id: string
  provider: string
  apiKey: string
  isActive: boolean
  category: string
  priority: number
  modelName?: string | null
}

interface SettingsClientProps {
  providers: Provider[]
  user?: any
}

export default function SettingsClient({ providers: initialProviders, user }: SettingsClientProps) {
  const router = useRouter()
  const [providers, setProviders] = useState(initialProviders)
  const [selectedCategory, setSelectedCategory] = useState('text_generation')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [autopilotLoading, setAutopilotLoading] = useState(false)

  // Estado para agregar nuevos proveedores
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [priority, setPriority] = useState(1)
   const [loading, setLoading] = useState(false)
  
  // Profile State
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    website: user?.website || '',
    twitter: user?.twitter || '',
    instagram: user?.instagram || '',
    linkedin: user?.linkedin || '',
    facebook: user?.facebook || '',
    tiktok: user?.tiktok || '',
    image: user?.image || ''
  })
  const [savingProfile, setSavingProfile] = useState(false)
  
  // Camera & Image State
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
            const img = new window.Image()
            img.src = event.target?.result as string
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const MAX_WIDTH = 400
                const scaleSize = MAX_WIDTH / img.width
                canvas.width = MAX_WIDTH
                canvas.height = img.height * scaleSize
                const ctx = canvas.getContext('2d')
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
                resolve(canvas.toDataURL('image/jpeg', 0.8)) // JPEG quality 0.8
            }
        }
        reader.onerror = (error) => reject(error)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0]
     if (file) {
         try {
             const compressed = await compressImage(file)
             setProfileData(prev => ({ ...prev, image: compressed }))
             toast.success('Imagen procesada correctamente')
         } catch (error) {
             toast.error('Error al procesar la imagen')
         }
     }
  }

  const startCamera = async () => {
     try {
         const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true })
         setStream(mediaStream)
         setShowCamera(true)
     } catch (err) {
         toast.error('No se pudo acceder a la cámara')
         console.error(err)
     }
  }

  const stopCamera = () => {
      if (stream) {
          stream.getTracks().forEach(track => track.stop())
          setStream(null)
      }
      setShowCamera(false)
  }

  const capturePhoto = () => {
      if (videoRef.current) {
          const canvas = document.createElement('canvas')
          canvas.width = videoRef.current.videoWidth
          canvas.height = videoRef.current.videoHeight
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(videoRef.current, 0, 0)
          
          // Resize/Compress logic inline for camera
          const img = new window.Image()
          img.src = canvas.toDataURL('image/jpeg')
          img.onload = () => {
                const finalCanvas = document.createElement('canvas')
                const MAX_WIDTH = 400
                const scaleSize = MAX_WIDTH / img.width
                finalCanvas.width = MAX_WIDTH
                finalCanvas.height = img.height * scaleSize
                const finalCtx = finalCanvas.getContext('2d')
                finalCtx?.drawImage(img, 0, 0, finalCanvas.width, finalCanvas.height)
                setProfileData(prev => ({ ...prev, image: finalCanvas.toDataURL('image/jpeg', 0.8) }))
                stopCamera()
          }
      }
  }

  // Attach stream to video element when modal opens
  useEffect(() => {
      if (showCamera && videoRef.current && stream) {
          videoRef.current.srcObject = stream
      }
  }, [showCamera, stream])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
        const res = await fetch('/api/users/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        })
        if (!res.ok) throw new Error('Error al guardar perfil')
        toast.success('Perfil actualizado correctamente')
        router.refresh()
    } catch (e) {
        toast.error('Error al actualizar perfil')
    } finally {
        setSavingProfile(false)
    }
  }

  // Filtrar proveedores por categoría, búsqueda y tags
  const filteredProviders = useMemo(() => {
    let filtered = AI_PROVIDERS.filter(p => 
      p.categories.includes(selectedCategory)
    )

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => {
        // Buscar en nombre, descripción, y modelos
        const matchName = p.name.toLowerCase().includes(query)
        const matchDesc = p.description.toLowerCase().includes(query)
        const matchTags = p.tags.some(tag => tag.toLowerCase().includes(query))
        const matchModels = p.models?.some(m => 
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query) ||
          m.tags.some(tag => tag.toLowerCase().includes(query))
        )
        return matchName || matchDesc || matchTags || matchModels
      })
    }

    // Filtrar por tags seleccionados
    if (selectedTags.length > 0) {
      filtered = filtered.filter(p => {
        return selectedTags.every(tag => 
          p.tags.includes(tag) || 
          p.models?.some(m => m.tags.includes(tag))
        )
      })
    }

    return filtered
  }, [selectedCategory, searchQuery, selectedTags])

  // Obtener tags únicos para la categoría actual
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>()
    AI_PROVIDERS
      .filter(p => p.categories.includes(selectedCategory))
      .forEach(p => {
        p.tags.forEach(tag => tagsSet.add(tag))
        p.models?.forEach(m => {
          m.tags.forEach(tag => tagsSet.add(tag))
        })
      })
    return Array.from(tagsSet).sort()
  }, [selectedCategory])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const toggleProviderExpansion = (providerId: string) => {
    setExpandedProviders(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }))
  }

  const handleSaveProvider = async () => {
    if (!selectedProvider || !apiKey) {
      toast.error('Por favor selecciona un proveedor e ingresa una API key')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey,
          category: selectedCategory,
          priority,
          modelName: selectedModel || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar proveedor')
      }

      const newProvider = await response.json()
      setProviders([...providers, newProvider])
      toast.success('Proveedor guardado correctamente')
      
      // Limpiar formulario
      setSelectedProvider('')
      setSelectedModel('')
      setApiKey('')
      setPriority(1)
      setShowAddForm(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return

    try {
      const response = await fetch(`/api/providers/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar')

      setProviders(providers.filter(p => p.id !== id))
      toast.success('Proveedor eliminado')
      router.refresh()
    } catch (error) {
      toast.error('Error al eliminar proveedor')
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      })

      if (!response.ok) throw new Error('Error al actualizar')

      setProviders(providers.map(p => 
        p.id === id ? { ...p, isActive } : p
      ))
      toast.success(isActive ? 'Proveedor activado' : 'Proveedor desactivado')
      router.refresh()
    } catch (error) {
      toast.error('Error al actualizar proveedor')
    }
  }

  const handleAutopilot = async () => {
    setAutopilotLoading(true)
    try {
      const response = await fetch('/api/autopilot', {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error en Autopilot')
      }

      const data = await response.json()
      toast.success('¡Ebook generado! Redirigiendo...')
      router.push(`/books/${data.bookId}`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setAutopilotLoading(false)
    }
  }

  const getProviderInfo = (providerId: string): AIProvider | undefined => {
    return AI_PROVIDERS.find(p => p.id === providerId)
  }

  const categoryProviders = providers.filter(p => p.category === selectedCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header with Back Button */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Nexbook-AI
            </span>
            <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-700">v2.9.0</Badge>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8 py-12 px-4">
        {/* Section Header */}
        <div className="space-y-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
              <Settings className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Configuración
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Gestiona tus preferencias globales y proveedores de IA
              </p>
            </div>
          </div>
        </div>

        {/* User Profile Section */}
        <Card className="border-l-4 border-l-blue-500 shadow-md bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={profileData.image} />
                    <AvatarFallback>{profileData.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                Perfil de Usuario
              </CardTitle>
              <CardDescription>Gestiona tu identidad pública y redes sociales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

               <div className="grid gap-6 md:grid-cols-2">
                   {/* Columna Izquierda: Avatar y Botones */}
                   <div className="flex flex-col items-center justify-center space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                            <AvatarImage src={profileData.image} objectFit="cover" />
                            <AvatarFallback className="text-4xl">{profileData.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex gap-2 w-full justify-center">
                             <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="w-4 h-4 mr-2" />
                                Subir Foto
                             </Button>
                             <Button variant="outline" size="sm" onClick={startCamera}>
                                <Camera className="w-4 h-4 mr-2" />
                                Cámara
                             </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            Recomendado: 400x400px. <br/> Se guardará optimizado.
                        </p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            aria-label="Subir foto de perfil"
                            onChange={handleFileChange} 
                        />
                   </div>

                   {/* Columna Derecha: Datos Textuales */}
                   <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre Completo</Label>
                            <Input 
                                    value={profileData.name} 
                                    onChange={(e) => setProfileData({...profileData, name: e.target.value})} 
                                    placeholder="Tu nombre" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Biografía</Label>
                            <Input 
                                    value={profileData.bio} 
                                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})} 
                                    placeholder="Cuéntanos sobre ti..." 
                            />
                        </div>
                   </div>
               </div>

                {/* Camera Modal Overlay */}
                {showCamera && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-2xl max-w-md w-full relative">
                            <Button variant="ghost" className="absolute right-2 top-2 z-10" onClick={stopCamera}>
                                <X className="w-6 h-6" />
                            </Button>
                            <h3 className="text-lg font-bold mb-4 text-center">Tomar Foto</h3>
                            <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            </div>
                            <div className="flex justify-center">
                                <Button onClick={capturePhoto} size="lg" className="rounded-full w-16 h-16 p-0 border-4 border-white shadow-lg bg-red-500 hover:bg-red-600">
                                    <div className="w-full h-full rounded-full border-2 border-transparent" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

               <div className="border-t pt-4">
                   <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Redes Sociales & Enlaces</h3>
                   <div className="grid gap-4 md:grid-cols-2">
                       <div className="space-y-2">
                           <Label className="flex items-center gap-2"><Globe className="w-4 h-4" /> Website</Label>
                           <Input value={profileData.website} onChange={(e) => setProfileData({...profileData, website: e.target.value})} placeholder="https://tusitio.com" />
                       </div>
                       <div className="space-y-2">
                           <Label className="flex items-center gap-2"><Twitter className="w-4 h-4" /> X (Twitter)</Label>
                           <Input value={profileData.twitter} onChange={(e) => setProfileData({...profileData, twitter: e.target.value})} placeholder="@usuario" />
                       </div>
                       <div className="space-y-2">
                           <Label className="flex items-center gap-2"><Instagram className="w-4 h-4" /> Instagram</Label>
                           <Input value={profileData.instagram} onChange={(e) => setProfileData({...profileData, instagram: e.target.value})} placeholder="@usuario" />
                       </div>
                       <div className="space-y-2">
                           <Label className="flex items-center gap-2"><Linkedin className="w-4 h-4" /> LinkedIn</Label>
                           <Input value={profileData.linkedin} onChange={(e) => setProfileData({...profileData, linkedin: e.target.value})} placeholder="Perfil de LinkedIn" />
                       </div>
                       <div className="space-y-2">
                           <Label className="flex items-center gap-2"><Facebook className="w-4 h-4" /> Facebook</Label>
                           <Input value={profileData.facebook} onChange={(e) => setProfileData({...profileData, facebook: e.target.value})} placeholder="Perfil de Facebook" />
                       </div>
                       <div className="space-y-2">
                           <Label className="flex items-center gap-2"><Music2 className="w-4 h-4" /> TikTok</Label>
                           <Input value={profileData.tiktok} onChange={(e) => setProfileData({...profileData, tiktok: e.target.value})} placeholder="@usuario" />
                       </div>
                   </div>
               </div>
               
               <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-blue-600 hover:bg-blue-700 text-white">
                      {savingProfile ? <Sparkles className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Guardar Perfil
                  </Button>
               </div>
            </CardContent>
        </Card>

        {/* Global Preferences */}
        <Card className="border-l-4 border-l-purple-500 shadow-md bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Settings className="w-5 h-5 text-purple-600" />
                Preferencias de Interfaz
              </CardTitle>
              <CardDescription>Personaliza el idioma y apariencia de Nexbook</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
               <LanguageSwitcher />
               
               <div className="flex flex-col gap-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    Tema <Badge variant="outline" className="text-[10px] ml-2">Próximamente</Badge>
                  </Label>
                   <Select disabled>
                    <SelectTrigger className="w-full bg-muted/50">
                      <SelectValue placeholder="Automático (Sistema)" />
                    </SelectTrigger>
                  </Select>
               </div>
            </CardContent>
        </Card>



        {/* Tabs por categoría */}
        <Tabs value={selectedCategory} onValueChange={(val) => {
            setSelectedCategory(val)
            setSearchQuery('') // Clear search on category switching to avoid confusion
        }} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-white dark:bg-gray-800 shadow-md">
            {CATEGORIES.map(cat => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white py-3"
              >
                <span className="mr-2">{cat.icon}</span>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Contenido de cada categoría */}
          {CATEGORIES.map(cat => (
            <TabsContent key={cat.id} value={cat.id} className="space-y-6">
              {/* Barra de búsqueda y filtros */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl">Buscar y Filtrar Proveedores</CardTitle>
                  <CardDescription>
                    Encuentra el proveedor perfecto por nombre, modelo, precio o características
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Búsqueda */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, modelo, precio (ej: 'free', 'gpt', 'imagen')..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 py-6 text-base"
                    />
                  </div>

                  {/* Tags de filtrado */}
                  {availableTags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Filtrar por características:</Label>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map(tag => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contador de resultados */}
                  <div className="text-sm text-muted-foreground">
                    Mostrando {filteredProviders.length} de {AI_PROVIDERS.filter(p => p.categories.includes(selectedCategory)).length} proveedores
                  </div>
                </CardContent>
              </Card>

              {/* Proveedores configurados */}
              {categoryProviders.length > 0 && (
                <Card className="shadow-md border-2 border-green-200 dark:border-green-800">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <CardTitle>Proveedores Configurados</CardTitle>
                    </div>
                    <CardDescription>
                      Gestiona tus proveedores activos con sistema de fallback por prioridad
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {categoryProviders
                      .sort((a, b) => a.priority - b.priority)
                      .map(provider => {
                        const info = getProviderInfo(provider.provider)
                        return (
                          <div
                            key={provider.id}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">#{provider.priority}</Badge>
                                <div>
                                  <div className="font-medium">
                                    {info?.name || provider.provider}
                                    {provider.modelName && (
                                      <span className="text-sm text-muted-foreground ml-2">
                                        ({provider.modelName})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {showKeys[provider.id] ? provider.apiKey : '••••••••••••••••'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowKeys(prev => ({
                                  ...prev,
                                  [provider.id]: !prev[provider.id]
                                }))}
                              >
                                {showKeys[provider.id] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>

                              <Switch
                                checked={provider.isActive}
                                onCheckedChange={(checked) => handleToggleActive(provider.id, checked)}
                              />

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProvider(provider.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                  </CardContent>
                </Card>
              )}

              {/* Lista de proveedores disponibles */}
              <div className="space-y-4">
                {filteredProviders.length === 0 ? (
                  <Card className="shadow-md">
                    <CardContent className="py-12 text-center">
                      <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg text-muted-foreground">
                        No se encontraron proveedores con esos criterios
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery('')
                          setSelectedTags([])
                        }}
                        className="mt-4"
                      >
                        Limpiar filtros
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  filteredProviders.map(provider => {
                    const currentConfig = providers.find(p => 
                      p.provider === provider.id && p.category === selectedCategory
                    );
                    
                    // Fallback: Check if this provider is configured in ANY other category
                    const globalConfig = providers.find(p => p.provider === provider.id && p.apiKey);

                    return (
                      <ProviderCard
                        key={provider.id}
                        provider={provider}
                        isExpanded={expandedProviders[provider.id] || false}
                        onToggleExpand={() => toggleProviderExpansion(provider.id)}
                        onSelectModel={(modelId) => {
                          // Handled internally in ProviderCard now
                        }}
                        isConfigured={!!currentConfig}
                        currentConfig={currentConfig}
                        globalConfig={globalConfig}
                        onSave={async (key, modelId) => {
                          // Inline save logic reuse
                          try {
                            const response = await fetch('/api/providers', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                provider: provider.id,
                                apiKey: key,
                                category: selectedCategory,
                                priority: currentConfig?.priority || 1,
                                modelName: modelId
                              })
                            })
                            if (!response.ok) throw new Error('Error al guardar')
                            const newProvider = await response.json()
                            // Update local state
                            const exists = providers.some(p => p.id === newProvider.id)
                            if (exists) {
                               setProviders(providers.map(p => p.id === newProvider.id ? newProvider : p))
                            } else {
                               setProviders([...providers, newProvider])
                            }
                            toast.success('Proveedor activado para esta categoría')
                          } catch (e) {
                            toast.error('Error al guardar la configuración')
                          }
                        }}
                      />
                    )
                  })
                )}
              </div>

              {/* Formulario para agregar proveedor */}
              {showAddForm && selectedProvider && (
                <Card className="shadow-lg border-2 border-purple-200 dark:border-purple-800 sticky top-4 z-10">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Agregar Nuevo Proveedor</CardTitle>
                        <CardDescription>
                          {getProviderInfo(selectedProvider)?.name}
                          {selectedModel && ` - ${selectedModel}`}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddForm(false)
                          setSelectedProvider('')
                          setSelectedModel('')
                          setApiKey('')
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Proveedor</Label>
                      <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_PROVIDERS
                            .filter(p => p.categories.includes(selectedCategory))
                            .map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="apiKey"
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Ingresa tu API key"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          asChild
                        >
                          <Link
                            href={getProviderInfo(selectedProvider)?.apiKeyUrl || '#'}
                            target="_blank"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Obtener Key
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Prioridad (1 = mayor prioridad)</Label>
                      <Input
                        id="priority"
                        type="number"
                        min="1"
                        value={priority}
                        onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <Button
                      onClick={handleSaveProvider}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {loading ? (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Guardar Proveedor
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

// Componente para cada card de proveedor
function ProviderCard({
  provider,
  isExpanded,
  onToggleExpand,
  onSelectModel,
  isConfigured,
  onSave,
  currentConfig,
  globalConfig
}: {
  provider: AIProvider
  isExpanded: boolean
  onToggleExpand: () => void
  onSelectModel: (modelId: string) => void
  isConfigured: boolean
  onSave: (apiKey: string, modelId?: string) => Promise<void>
  currentConfig?: any
  globalConfig?: any
}) {
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || globalConfig?.apiKey || '')
  const [selectedModel, setSelectedModel] = useState<string>(currentConfig?.modelName || '')
  const [isSaving, setIsSaving] = useState(false)
  const [showInput, setShowInput] = useState(!isConfigured)

  // Auto-select first model if none selected and not configured
  useEffect(() => {
    if (!selectedModel && !isConfigured && provider.models && provider.models.length > 0) {
       // Default to first 'popular' or just first
       setSelectedModel(provider.models[0].id)
    }
  }, [provider, isConfigured, selectedModel])

  const handleSave = async () => {
    if (!apiKey) {
      toast.error("Ingresa una API Key")
      return
    }
    setIsSaving(true)
    await onSave(apiKey, selectedModel || undefined)
    setIsSaving(false)
    if (!isConfigured) setShowInput(false)
  }

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId)
    onSelectModel(modelId)
    toast.success(`Modelo seleccionado: ${modelId}`)
  }

  return (
    <Card className={`shadow-md transition-all ${
      isConfigured ? 'border-2 border-green-200 dark:border-green-800' : ''
    }`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-xl">{provider.name}</CardTitle>
              {isConfigured && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configurado
                </Badge>
              )}
              {provider.tags.includes('gratis') && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  GRATIS
                </Badge>
              )}
            </div>
            <CardDescription className="text-base">
              {provider.description}
            </CardDescription>
            <div className="flex flex-wrap gap-1 mt-3">
              {provider.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            {/* Show Selected Model Badge */}
            {selectedModel && (
                <div className="mt-4 flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Modelo activo:</span>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                        <Brain className="w-3 h-3 mr-1"/>
                        {provider.models?.find(m => m.id === selectedModel)?.name || selectedModel}
                    </Badge>
                </div>
            )}
          </div>

          <div className="flex flex-col gap-3 min-w-[200px]">
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full justify-start"
              >
                <Link href={provider.apiKeyUrl} target="_blank">
                  <Key className="h-4 w-4 mr-2" />
                  Obtener API Key
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full justify-start"
              >
                <Link href={provider.docsUrl} target="_blank">
                  <Info className="h-4 w-4 mr-2" />
                  Documentación
                </Link>
              </Button>
            </div>

            {/* Inline API Key Input */}
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {isConfigured ? 'Actualizar Configuración:' : 'Configurar Provider:'}
              </Label>
              <div className="flex flex-col gap-2">
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={!apiKey || isSaving}
                  className="w-full h-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isSaving ? (
                    <Sparkles className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Save className="h-3 w-3 mr-1" />
                  )}
                  {isConfigured ? 'Actualizar' : 'Guardar y Activar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Modelos disponibles */}
      {provider.models && provider.models.length > 0 && (
        <CardContent className="pt-0">
          <Button
            variant="ghost"
            onClick={onToggleExpand}
            className="w-full justify-between hover:bg-gray-100 dark:hover:bg-gray-800 h-8 text-sm"
          >
            <span className="font-medium">
              {isExpanded ? 'Ocultar modelos' : `Ver ${provider.models.length} modelos disponibles (Click para seleccionar)`}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {isExpanded && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {provider.models.map(model => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isSelected={selectedModel === model.id}
                  onSelect={() => handleSelectModel(model.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// Componente para cada modelo
function ModelCard({
  model,
  isSelected,
  onSelect
}: {
  model: AIModel
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <div 
        onClick={onSelect}
        className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-all ${
        isSelected 
            ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500 dark:bg-purple-900/20' 
            : 'bg-white dark:bg-gray-900 hover:border-purple-300'
    }`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
            <div className="font-medium text-sm">{model.name}</div>
            {isSelected && <Badge variant="default" className="h-4 text-[10px] bg-purple-600">Activo</Badge>}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {model.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1">
              {tag}
            </Badge>
          ))}
        </div>
        {model.pricing && (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {model.pricing}
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant={isSelected ? "default" : "ghost"}
        className={`h-7 w-7 p-0 ${isSelected ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
      >
        {isSelected ? <CheckCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </Button>
    </div>
  )
}
