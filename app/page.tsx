import Link from 'next/link'
import { BookOpen, Sparkles, Download, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Nexbook-AI
            </span>
            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">v2.8.0</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="space-y-6 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Create Amazing <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Books with AI</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your ideas into complete, professional ebooks in minutes. Advanced AI generates compelling chapters with stunning illustrations and publication-ready content.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Creating
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Powerful Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-blue-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="h-7 w-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Multi-AI Pipeline</h3>
            <p className="text-gray-600">
              Advanced pipeline with automatic fallback between APIs for text generation, grammar, humanization, and more. Never run out of tokens!
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-purple-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-7 w-7 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Premium Quality Images</h3>
            <p className="text-gray-600">
              Generate high-quality, realistic illustrations and cover images using top-tier AI models with optimized prompts for maximum quality.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-pink-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
              <Download className="h-7 w-7 text-pink-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Export to Multiple Formats</h3>
            <p className="text-gray-600">
              Download your books as professionally formatted PDF, EPUB, or DOCX files ready to publish on Amazon KDP, Apple Books, and more.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Write Your First Book?</h2>
          <p className="text-xl mb-8 opacity-90">Join creators using AI to bring their ideas to life</p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto max-w-7xl px-4 text-center text-gray-600">
          <p>&copy; 2025 Nexbook-AI. Powered by Advanced AI Technology.</p>
        </div>
      </footer>
    </div>
  )
}
