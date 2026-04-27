import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_GM_CONFIG } from '@/lib/gm-engine'
import type { GmConfig, GmSavedScenario, Quote } from '@/lib/types'
import GmCalculatorClient from '@/components/admin/GmCalculatorClient'

// The subset of Quote data needed by GmCalculatorClient
export type GmQuote = Pick<
  Quote,
  'id' | 'quoteRef' | 'clientName' | 'projectName' | 'totalPrice' | 'totalHours' | 'createdAt' | 'inputs' | 'outputs'
>

const QUOTE_SELECT = 'id, quote_ref, client_name, project_name, total_price, total_hours, created_at, inputs, outputs'

function mapQuoteRow(r: Record<string, unknown>): GmQuote {
  return {
    id:          r.id as string,
    quoteRef:    r.quote_ref as string,
    clientName:  r.client_name as string,
    projectName: r.project_name as string,
    totalPrice:  r.total_price as number,
    totalHours:  r.total_hours as number,
    createdAt:   r.created_at as string,
    inputs:      r.inputs as Quote['inputs'],
    outputs:     r.outputs as Quote['outputs'],
  }
}

async function fetchGmConfig(): Promise<GmConfig> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase.from('gm_config').select('config').eq('id', 1).single()
    if (!data) return DEFAULT_GM_CONFIG

    const dbGmRoles = (data.config as Partial<GmConfig>)?.defaultRoles
    const mergedRoles = dbGmRoles
      ? dbGmRoles.map((dbRole) => {
          const defaultRole = DEFAULT_GM_CONFIG.defaultRoles.find((r) => r.role === dbRole.role)
          return { ...dbRole, allocations: dbRole.allocations ?? defaultRole?.allocations }
        })
      : DEFAULT_GM_CONFIG.defaultRoles

    return {
      ...DEFAULT_GM_CONFIG,
      ...(data.config as Partial<GmConfig>),
      defaultRoles: mergedRoles,
    }
  } catch {
    return DEFAULT_GM_CONFIG
  }
}

async function fetchSavedScenarios(): Promise<GmSavedScenario[]> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('gm_scenarios')
      .select('*')
      .order('created_at', { ascending: false })
    return (data ?? []).map((r) => ({
      id:          r.id as string,
      quoteId:     r.quote_id as string | null,
      quoteRef:    r.quote_ref as string | null,
      clientName:  r.client_name as string | null,
      projectName: r.project_name as string | null,
      inputs:      r.inputs as GmSavedScenario['inputs'],
      outputs:     r.outputs as GmSavedScenario['outputs'],
      notes:       r.notes as string | null,
      createdAt:   r.created_at as string,
      createdBy:   r.created_by as string | null,
    }))
  } catch {
    return []
  }
}

async function fetchAllQuotes(): Promise<GmQuote[]> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('quotes')
      .select(QUOTE_SELECT)
      .order('created_at', { ascending: false })
    return (data ?? []).map(mapQuoteRow)
  } catch {
    return []
  }
}

async function fetchQuoteById(id: string): Promise<GmQuote | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('quotes')
      .select(QUOTE_SELECT)
      .eq('id', id)
      .single()
    if (error || !data) return null
    return mapQuoteRow(data as Record<string, unknown>)
  } catch {
    return null
  }
}

export default async function AdminGmPage({
  searchParams,
}: {
  searchParams?: { quoteId?: string }
}) {
  const main = String(process.env.NEXT_PUBLIC_MAIN_CALC_ORIGIN || '')
    .trim()
    .replace(/\/$/, '')
  if (main) {
    redirect(`${main}/admin.html`)
  }

  const quoteId = searchParams?.quoteId ?? null

  // Fetch the three data sources independently so a failure in one
  // (e.g. gm_scenarios table not yet created) never silences the others.
  const [gmConfig, savedScenarios, quotes, initialLinkedQuote] = await Promise.all([
    fetchGmConfig(),
    fetchSavedScenarios(),
    fetchAllQuotes(),
    // Fetch the linked quote directly by ID — more reliable than list.find()
    quoteId ? fetchQuoteById(quoteId) : Promise.resolve(null),
  ])

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
        <h1 className="text-lg font-bold text-gray-900">GM Discount Calculator</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Model discount scenarios and evaluate gross margin impact before approving a deal.
        </p>
      </div>

      <GmCalculatorClient
        gmConfig={gmConfig}
        initialScenarios={savedScenarios}
        quotes={quotes}
        initialLinkedQuote={initialLinkedQuote}
      />
    </div>
  )
}
