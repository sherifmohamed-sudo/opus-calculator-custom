import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_PRICING_CONFIG } from '@/lib/pricing-engine'
import { DEFAULT_GM_CONFIG } from '@/lib/gm-engine'
import type { PricingConfig, GmConfig } from '@/lib/types'
import PricingConfigPanel from '@/components/admin/PricingConfigPanel'
import AdminNav from '@/components/admin/AdminNav'

async function fetchConfigs(): Promise<{
  config: PricingConfig
  gmConfig: GmConfig
  updatedAt: string | null
  updatedBy: string | null
}> {
  try {
    const supabase = createServiceClient()
    const [pricingResult, gmResult] = await Promise.all([
      supabase.from('pricing_config').select('config, updated_at, updated_by').eq('id', 1).single(),
      supabase.from('gm_config').select('config').eq('id', 1).single(),
    ])

    const config: PricingConfig = pricingResult.data
      ? { ...DEFAULT_PRICING_CONFIG, ...(pricingResult.data.config as Partial<PricingConfig>) }
      : DEFAULT_PRICING_CONFIG

    const dbGmRoles = (gmResult.data?.config as Partial<GmConfig> | undefined)?.defaultRoles
    const mergedRoles = dbGmRoles
      ? dbGmRoles.map((dbRole) => {
          const defaultRole = DEFAULT_GM_CONFIG.defaultRoles.find((r) => r.role === dbRole.role)
          return { ...dbRole, allocations: dbRole.allocations ?? defaultRole?.allocations }
        })
      : DEFAULT_GM_CONFIG.defaultRoles

    const gmConfig: GmConfig = gmResult.data
      ? {
          ...DEFAULT_GM_CONFIG,
          ...(gmResult.data.config as Partial<GmConfig>),
          defaultRoles: mergedRoles,
        }
      : DEFAULT_GM_CONFIG

    return {
      config,
      gmConfig,
      updatedAt: pricingResult.data?.updated_at as string | null ?? null,
      updatedBy: pricingResult.data?.updated_by as string | null ?? null,
    }
  } catch {
    return { config: DEFAULT_PRICING_CONFIG, gmConfig: DEFAULT_GM_CONFIG, updatedAt: null, updatedBy: null }
  }
}

export default async function AdminPricingPage() {
  const main = String(process.env.NEXT_PUBLIC_MAIN_CALC_ORIGIN || '')
    .trim()
    .replace(/\/$/, '')
  if (main) {
    redirect(`${main}/admin.html`)
  }

  const { config, gmConfig, updatedAt, updatedBy } = await fetchConfigs()

  const lastSaved =
    updatedAt && updatedBy !== 'system'
      ? new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(updatedAt)) + (updatedBy ? ` by ${updatedBy}` : '')
      : null

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-5">
      <div className="mb-3">
        <Link
          href="/calculator"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 mb-2 transition-colors"
        >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Calculator
          </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Pricing Configuration</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Edit calculator values. Changes take effect immediately for all sellers.
            </p>
          </div>
          {lastSaved && (
            <p className="text-[11px] text-gray-400 mt-1 whitespace-nowrap shrink-0">
              Last saved: {lastSaved}
            </p>
          )}
        </div>
      </div>

      <AdminNav active="pricing" />

      <PricingConfigPanel initialConfig={config} initialGmConfig={gmConfig} />
    </div>
  )
}
