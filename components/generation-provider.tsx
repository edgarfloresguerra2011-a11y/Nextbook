'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, BookOpen, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GenerationState {
  isGenerating: boolean
  progress: string
  bookId: string | null
  bookTitle: string | null
  error: string | null
}

interface GenerationContextType {
  state: GenerationState
  startGeneration: (formData: any) => Promise<void>
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined)

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: '',
    bookId: null,
    bookTitle: null,
    error: null
  })
  
  const router = useRouter()

  const startGeneration = useCallback(async (formData: any) => {
    setState({ 
      isGenerating: true, 
      progress: 'Starting generation engine...', 
      bookId: null, 
      bookTitle: formData.title,
      error: null 
    })
    
    // Minimal delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to start generation')
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let partialRead = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        partialRead += decoder.decode(value, { stream: true })
        let lines = partialRead.split('\n')
        partialRead = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              
              if (parsed.status === 'progress') {
                setState(prev => ({ ...prev, progress: parsed.message || 'Processing...' }))
              } else if (parsed.status === 'completed') {
                setState(prev => ({ 
                    ...prev, 
                    isGenerating: false, 
                    progress: 'Completed', 
                    bookId: parsed.bookId 
                }))
                
                toast.success('Book generated successfully!', {
                    action: {
                        label: 'View Book',
                        onClick: () => router.push(`/books/${parsed.bookId}`)
                    },
                    duration: 10000,
                })
                
                // Optional: Automatically redirect if user wants that behavior, 
                // but for "multi-tasking" we usually prefer a notification.
                // However, to keep it continuity-friendly:
                router.refresh() // Refresh data
              } else if (parsed.status === 'error') {
                throw new Error(parsed.message || 'Generation failed')
              }
            } catch (e) {
              console.error('Error parsing SSE:', e)
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Generation Error:', error)
      setState(prev => ({ 
          ...prev, 
          isGenerating: false, 
          error: error.message || 'An error occurred',
          progress: 'Error occurred'
      }))
      toast.error(error.message || 'Failed to generate book')
    }
  }, [router])

  return (
    <GenerationContext.Provider value={{ state, startGeneration }}>
      {children}
      
      {/* Persistent Floating Progress Widget */}
      {state.isGenerating && (
         <div className="fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl p-4 animate-in slide-in-from-bottom duration-300 pointer-events-auto">
            <div className="flex items-start gap-4">
               <div className="relative">
                 <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                 <div className="relative p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                 </div>
               </div>
               <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>Generating Book...</span>
                    <span className="text-xs text-blue-600 font-medium">Running</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {state.bookTitle}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {state.progress}
                  </p>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 mt-3 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 w-1/3 animate-progress"></div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Success State Indicator (Transient) */}
      {!state.isGenerating && state.bookId && !state.error && (
         <div className="fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-slate-900 border border-green-200 dark:border-green-900 shadow-2xl rounded-xl p-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-start gap-4">
               <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
               </div>
               <div className="flex-1">
                  <h4 className="font-semibold text-sm text-green-700 dark:text-green-400">Generation Complete</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">"{state.bookTitle}" is ready to read.</p>
                  <Button 
                    size="sm" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                        router.push(`/books/${state.bookId}`)
                        // Reset state after navigation
                        setState(prev => ({...prev, bookId: null}))
                    }}
                  >
                    View Book
                  </Button>
               </div>
            </div>
         </div>
      )}
    </GenerationContext.Provider>
  )
}

export const useGeneration = () => {
  const context = useContext(GenerationContext)
  if (!context) throw new Error('useGeneration must be used within GenerationProvider')
  return context
}
