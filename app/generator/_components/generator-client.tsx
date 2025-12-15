'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ArrowLeft, Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useGeneration } from '@/components/generation-provider'

const GENRES = [
  'Fiction',
  'Non-Fiction',
  'Science Fiction',
  'Fantasy',
  'Romance',
  'Mystery',
  'Thriller',
  'Horror',
  'Self-Help',
  'Business',
  'Biography',
  'History',
  'Philosophy',
  'Technology',
  'Health & Wellness',
]

type GeneratorClientProps = {
  user: any
}

export function GeneratorClient({ user }: GeneratorClientProps) {
  const router = useRouter()
  // Connect to global generation context
  const { state, startGeneration } = useGeneration()
  const { isGenerating, progress } = state

  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    description: '',
    textProvider: 'default', // Automatic selection of best provider
    imageProvider: 'default',
    numChapters: 3, // Default 3 chapters
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.genre || !formData.description) {
      toast.error('Please fill in all fields')
      return
    }

    if (isGenerating) {
        toast.error('A book is already generating. Please wait.')
        return
    }

    await startGeneration(formData)
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
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold">Generate New Book</h1>
          </div>
          <p className="text-gray-600 mb-8">
            Fill in the details below and AI will create a complete, professional ebook with chapters, stunning illustrations, and publication-ready content
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Book Title *</Label>
              <Input
                id="title"
                placeholder="e.g., The Future of Artificial Intelligence"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={isGenerating}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre *</Label>
              <Select
                value={formData.genre}
                onValueChange={(value) => setFormData({ ...formData, genre: value })}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description / Prompt *</Label>
              <Textarea
                id="description"
                placeholder="Describe what your book should be about. Include key themes, characters, plot points, or topics you want to cover. For example: 'A comprehensive guide to modern AI technologies, covering machine learning, neural networks, and practical applications...'"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isGenerating}
                rows={6}
                required
              />
              <p className="text-xs text-gray-500">
                The more detailed your description, the better the AI can generate your book
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="textProvider">Text Generation AI</Label>
                <Select
                  value={formData.textProvider}
                  onValueChange={(value) => setFormData({ ...formData, textProvider: value })}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select text AI provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Auto (Best Available)</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                    <SelectItem value="google">Google Gemini</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="groq">Groq (Ultra Fast)</SelectItem>
                    <SelectItem value="mistral">Mistral AI</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="perplexity">Perplexity</SelectItem>
                    <SelectItem value="together">Together AI</SelectItem>
                    <SelectItem value="fireworks">Fireworks AI</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Requiere configurar API Keys en Settings
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageProvider">Image Generation AI</Label>
                <Select
                  value={formData.imageProvider}
                  onValueChange={(value) => setFormData({ ...formData, imageProvider: value })}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select image AI provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Por Defecto (OpenAI/Pollinations)</SelectItem>
                    <SelectItem value="openai">OpenAI DALL-E (Your Key)</SelectItem>
                    <SelectItem value="stability">Stability AI (Your Key)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  High-quality illustration per chapter
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numChapters">Number of Chapters</Label>
              <Select
                value={formData.numChapters.toString()}
                onValueChange={(value) => setFormData({ ...formData, numChapters: parseInt(value) })}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select number of chapters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Chapters (~15 min)</SelectItem>
                  <SelectItem value="5">5 Chapters (~25 min)</SelectItem>
                  <SelectItem value="7">7 Chapters (~35 min)</SelectItem>
                  <SelectItem value="10">10 Chapters (~50 min)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                More chapters = Longer generation time
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 text-lg"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {progress || 'Generating...'}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Book with AI
                </>
              )}
            </Button>
          </form>

          {isGenerating && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                 </div>
                 <div>
                    <p className="text-sm font-semibold text-green-800">
                        Generation Started in Background
                    </p>
                    <p className="text-xs text-green-700">
                        You can safely leave this page. We'll notify you when it's done.
                    </p>
                 </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
