'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Sparkles, Zap, Crown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface UpgradeModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  currentPlan?: string
}

export function UpgradeModal({ open, onOpenChange, trigger, currentPlan = 'free' }: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleUpgrade = async (plan: string) => {
    setLoading(plan)
    try {
        // DEBUG MODE: Actualización inmediata sin pasarela de pago para pruebas
        const response = await fetch('/api/debug/upgrade', { 
            method: 'POST',
            body: JSON.stringify({ plan }) 
        })
        
        if (!response.ok) throw new Error('Upgrade failed')
        
        toast.success(`¡Plan ${plan.toUpperCase()} activado! Recargando...`)
        
        // Recargar página para reflejar cambios
        setTimeout(() => {
            window.location.reload()
        }, 1500)
        
    } catch (error) {
        console.error(error)
        toast.error('Error al activar el plan de prueba')
        setLoading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl w-full bg-slate-50 dark:bg-slate-900 border-0 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="text-center pb-8 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Desbloquea todo el potencial
          </DialogTitle>
          <DialogDescription className="text-lg text-slate-600 dark:text-slate-400">
            Elige el plan perfecto para potenciar tu creatividad con IA
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          {/* FREE PLAN */}
          <div className={`relative p-6 rounded-2xl border-2 bg-white dark:bg-slate-800 flex flex-col ${currentPlan === 'free' ? 'border-slate-300 opacity-80' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Start</h3>
              <div className="text-3xl font-bold mt-2">$0<span className="text-sm text-slate-500 font-normal">/mes</span></div>
              <p className="text-sm text-slate-500 mt-2">Para experimentar con la IA</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /> 1 Libro (Crédito único)</li>
              <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /> Exportación PDF Básico</li>
              <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /> Modelos Estándar</li>
            </ul>
             <Button variant="outline" disabled className="w-full mt-auto">
               {currentPlan === 'free' ? 'Plan Actual' : 'Downgrade'}
             </Button>
          </div>

          {/* INDIE PLAN */}
          <div className="relative p-6 rounded-2xl border-2 border-purple-200 bg-white dark:bg-slate-800 flex flex-col shadow-xl transform scale-105 z-10">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-4 py-1">RECOMENDADO</Badge>
             </div>
            <div className="mb-4">
              <h3 className="text-xl font-bold text-purple-600 flex items-center gap-2">
                 <Zap className="w-5 h-5 fill-current" /> Indie
              </h3>
              <div className="text-3xl font-bold mt-2">$29<span className="text-sm text-slate-500 font-normal">/mes</span></div>
              <p className="text-sm text-slate-500 mt-2">Para autores independientes</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-2 text-sm font-medium"><Check className="w-4 h-4 text-purple-600" /> 15 Créditos/mes</li>
              <li className="flex items-center gap-2 text-sm font-medium"><Check className="w-4 h-4 text-purple-600" /> Exportación EPUB & DOCX</li>
              <li className="flex items-center gap-2 text-sm font-medium"><Check className="w-4 h-4 text-purple-600" /> Copywriting IA</li>
              <li className="flex items-center gap-2 text-sm font-medium"><Check className="w-4 h-4 text-purple-600" /> Mockups Generador (10/mes)</li>
            </ul>
             <Button 
                onClick={() => handleUpgrade('indie')} 
                disabled={loading !== null || currentPlan === 'indie'}
                className="w-full mt-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
            >
               {loading === 'indie' ? (
                   <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Procesando...</div>
               ) : currentPlan === 'indie' ? 'Plan Actual' : 'Elegir Indie'}
             </Button>
          </div>

          {/* PRO PLAN */}
          <div className="relative p-6 rounded-2xl border-2 border-blue-200 bg-white dark:bg-slate-800 flex flex-col hover:border-blue-300 transition-colors">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-blue-600 flex items-center gap-2">
                 <Crown className="w-5 h-5 fill-current" /> Pro
              </h3>
              <div className="text-3xl font-bold mt-2">$79<span className="text-sm text-slate-500 font-normal">/mes</span></div>
              <p className="text-sm text-slate-500 mt-2">Para agencias y power users</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-blue-600" /> 50 Créditos/mes</li>
              <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-blue-600" /> Todo lo de Indie +</li>
              <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-blue-600" /> Integraciones API Directas</li>
              <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-blue-600" /> Modelos GPT-4o Exclusivos</li>
              <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-blue-600" /> Soporte Prioritario</li>
            </ul>
             <Button 
                onClick={() => handleUpgrade('pro')} 
                disabled={loading !== null || currentPlan === 'pro'}
                className="w-full mt-auto bg-blue-600 hover:bg-blue-700 text-white"
             >
               {loading === 'pro' ? 'Procesando...' : currentPlan === 'pro' ? 'Plan Actual' : 'Elegir Pro'}
             </Button>
          </div>

        </div>
        
        <div className="text-center pb-4 text-sm text-muted-foreground">
            Pagos seguros procesados por Stripe. Puedes cancelar en cualquier momento.
        </div>
      </DialogContent>
    </Dialog>
  )
}
