'use client'

import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Globe } from 'lucide-react'

// Define languages with native names and flags
const LANGUAGES = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
]

export function LanguageSwitcher() {
  const { i18n, t, ready } = useTranslation('common')
  // Initialize state with current i18n language or fallback, ensuring consistency
  const [currentLang, setCurrentLang] = useState('es')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (i18n.language) {
       // Take only the first 2 chars (e.g., 'en-US' -> 'en') to match our codes
       const shortLang = i18n.language.split('-')[0]
       if (LANGUAGES.some(l => l.code === shortLang)) {
           setCurrentLang(shortLang)
       }
    }
  }, [i18n.language])

  const handleLanguageChange = async (value: string) => {
    try {
        // 1. Update React state and i18next instance
        await i18n.changeLanguage(value)
        setCurrentLang(value)
        
        // 2. Refresh translations (sometimes needed if using backend loader dynamically)
        // i18n.reloadResources() // usually auto-handled
        
        // 3. Persist to localStorage expressly
        localStorage.setItem('nexbook_locale', value)

        // 4. Sync with Backend
        await fetch('/api/users/me/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: value }),
        })
        
        toast.success(t('settings.language_updated', 'Idioma actualizado / Language updated'))
        
        // Optional: Force reload to ensure all components (especially server components or non-reactive parts) update completely
        // window.location.reload() 
    } catch (error) {
        console.error('Error changing language:', error)
        toast.error('Error updating language')
    }
  }

  if (!mounted || !ready) {
      return null // Avoid hydration mismatch on initial render and wait for translations
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium flex items-center gap-2">
          <Globe className="w-4 h-4" />
          {t('language_selector.label', 'Idioma / Language')}
      </label>
      <Select value={currentLang} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" aria-label="Select Language">
          <SelectValue placeholder="Select Language" />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} className="cursor-pointer">
              <span className="mr-2 text-lg" role="img" aria-label={lang.name}>{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
