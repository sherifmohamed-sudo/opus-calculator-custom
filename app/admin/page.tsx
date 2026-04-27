import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import AdminDashboardClient from './AdminDashboardClient'
import PricingGuideUpload from './PricingGuideUpload'
import AdminNav from '@/components/admin/AdminNav'
import type { Quote } from '@/lib/types'

function mapRow(row: Record<string, unknown>): Quote {
  return {
    id:             row.id as string,
    quoteRef:       row.quote_ref as string,
    sellerId:       row.seller_id as string,
    sellerName:     row.seller_name as string,
    sellerEmail:    row.seller_email as string,
    projectName:    row.project_name as string,
    clientName:     row.client_name as string,
    calculatorMode: row.calculator_mode as Quote['calculatorMode'],
    modelVersion:   row.model_version as string,
    inputs:         row.inputs as Quote['inputs'],
    outputs:        row.outputs as Quote['outputs'],
    totalPrice:     row.total_price as number,
    totalWeeks:     row.total_weeks as number,
    totalHours:     row.total_hours as number,
    notes:          row.notes as string | undefined,
    status:         row.status as Quote['status'],
    createdAt:      row.created_at as string,
  }
}

export default async function AdminPage() {
  const main = String(process.env.NEXT_PUBLIC_MAIN_CALC_ORIGIN || '')
    .trim()
    .replace(/\/$/, '')
  if (main) {
    redirect(`${main}/admin.html`)
  }

  // Query directly with the service-role client — bypasses RLS so ALL sellers'
  // quotes are returned. The admin layout already ensures only admins reach here.
  const supabase = createServiceClient()
  const { data: rows, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Admin page — failed to fetch quotes:', error.message)
  }

  const quotes: Quote[] = (rows ?? []).map(mapRow)

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
        <h1 className="text-lg font-bold text-gray-900">Quote Dashboard</h1>
        <p className="text-xs text-gray-500 mt-0.5">All quotes across all sellers</p>
      </div>

      <AdminNav active="quotes" />

      <PricingGuideUpload />
      <AdminDashboardClient initialQuotes={quotes} />
    </div>
  )
}
