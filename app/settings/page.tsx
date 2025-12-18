import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import SettingsClient from './_components/settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  const userId = (session.user as any)?.id
  
  // Fetch user's provider configs
  const providers = await prisma.providerConfig.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
        accounts: true 
    }
  })

  // Load Master Secrets from .secrets folder
  let masterSecrets: any = {};
  try {
    const fs = require('fs');
    const path = require('path');
    const secretsPath = path.join(process.cwd(), '.secrets', 'apis.json');
    if (fs.existsSync(secretsPath)) {
        masterSecrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
    }
  } catch(e) {}

  // Detect available system providers from environment variables & Master Secrets
  const systemProviders = {
    openai: !!(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || masterSecrets.OPENAI_API_KEY),
    anthropic: !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY || masterSecrets.ANTHROPIC_API_KEY),
    google: !!(process.env.GOOGLE_API_KEY || process.env.GOOGLE_KEY || masterSecrets.GOOGLE_API_KEY),
    deepseek: !!(process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY || masterSecrets.DEEPSEEK_API_KEY),
    openrouter: !!(process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || masterSecrets.OPENROUTER_API_KEY),
    groq: !!(process.env.GROQ_API_KEY || process.env.GROQ_KEY || masterSecrets.GROQ_API_KEY),
    replicate: !!(process.env.REPLICATE_API_KEY || process.env.REPLICATE_KEY || masterSecrets.REPLICATE_API_KEY),
    stability: !!(process.env.STABILITY_API_KEY || process.env.STABILITY_KEY || masterSecrets.STABILITY_API_KEY),
    serpapi: !!(process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY || masterSecrets.SERPAPI_KEY),
  }






  return <SettingsClient providers={providers} user={user} systemProviders={systemProviders} />
}
