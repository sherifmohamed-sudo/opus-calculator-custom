'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import ModeToggle from '@/components/calculator/ModeToggle'
import DetailedCalculator from '@/components/calculator/DetailedCalculator'
import SimpleCalculator from '@/components/calculator/SimpleCalculator'
import SummaryPanel from '@/components/calculator/SummaryPanel'
import GenerateQuoteButton from '@/components/calculator/GenerateQuoteButton'
import Input from '@/components/ui/Input'
import type {
  CalculatorMode,
  DetailedInputs,
  SimpleInputs,
  PricingConfig,
} from '@/lib/types'
import { calculateDetailed, calculateSimple, DEFAULT_DEPLOYMENT } from '@/lib/pricing-engine'
import {
  getMainCalcOrigin,
  requestAccessTokenFromOpener,
  subscribeMainAccessToken,
} from '@/lib/delivery-main-bridge'

interface CalculatorClientProps {
  pricingConfig: PricingConfig
}

const DEFAULT_DETAILED_INPUTS: DetailedInputs = {
  tier1UseCases: 0,
  tier2UseCases: 0,
  integrations: {
    restLibrary: 0,     restModification: 0,  restNew: 0,
    soapLibrary: 0,     soapModification: 0,  soapNew: 0,
    dbLibrary: 0,       dbModification: 0,    dbNew: 0,
    restAuth: 'API Key / Basic',
    soapAuth: 'API Key / Basic',
    dbAuth:   'API Key / Basic',
  },
  deployment: DEFAULT_DEPLOYMENT,
  training: false,
  complexityFactor: 0,
}

const DEFAULT_SIMPLE_INPUTS: SimpleInputs = {
  tier1UseCases: 0,
  tier2UseCases: 0,
  standardApiIntegrations: 0,
  customIntegrations: 0,
  deployment: DEFAULT_DEPLOYMENT,
  training: false,
  complexityFactor: 0,
}

export default function CalculatorClient({ pricingConfig }: CalculatorClientProps) {
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<CalculatorMode>('detailed')
  const [detailedInputs, setDetailedInputs] = useState<DetailedInputs>(DEFAULT_DETAILED_INPUTS)
  const [simpleInputs, setSimpleInputs]     = useState<SimpleInputs>(DEFAULT_SIMPLE_INPUTS)
  const [clientName,         setClientName]         = useState('')
  const [projectName,        setProjectName]        = useState('')
  const [notes,              setNotes]              = useState('')
  const [requestedDiscount,  setRequestedDiscount]  = useState(0)
  const [successMsg,         setSuccessMsg]         = useState('')
  const [errorMsg,           setErrorMsg]           = useState('')
  const [mainAccessToken,   setMainAccessToken]   = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeMainAccessToken(setMainAccessToken)
    requestAccessTokenFromOpener()
    return unsub
  }, [])

  // Handle duplicate: pre-fill inputs from sessionStorage when redirected from /quotes
  useEffect(() => {
    if (searchParams.get('duplicate') === '1') {
      const stored = sessionStorage.getItem('duplicateQuote')
      if (stored) {
        try {
          const { mode: m, inputs } = JSON.parse(stored)
          if (m === 'detailed') {
            setMode('detailed')
            setDetailedInputs(inputs)
          } else if (m === 'simple') {
            setMode('simple')
            setSimpleInputs(inputs)
          }
        } catch {
          // ignore malformed storage
        } finally {
          sessionStorage.removeItem('duplicateQuote')
        }
      }
    }
  }, [searchParams])

  const outputs = useMemo(
    () =>
      mode === 'detailed'
        ? calculateDetailed(detailedInputs, pricingConfig)
        : calculateSimple(simpleInputs, pricingConfig),
    [mode, detailedInputs, simpleInputs, pricingConfig]
  )

  const canGenerate = clientName.trim().length > 0 && projectName.trim().length > 0

  function handleModeChange(newMode: CalculatorMode) {
    if (newMode === mode) return

    const current = mode === 'detailed' ? detailedInputs : simpleInputs
    const shared = {
      tier1UseCases:    current.tier1UseCases,
      tier2UseCases:    current.tier2UseCases,
      deployment:       current.deployment,
      training:         current.training,
      complexityFactor: current.complexityFactor,
    }

    if (newMode === 'simple') {
      setSimpleInputs(prev => ({ ...prev, ...shared }))
    } else {
      setDetailedInputs(prev => ({ ...prev, ...shared }))
    }

    setMode(newMode)
    setSuccessMsg('')
    setErrorMsg('')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleSuccess(quoteRef: string, _quoteId: string) {
    setSuccessMsg(`Quote ${quoteRef} saved and PDF downloaded.`)
    setErrorMsg('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleError(message: string) {
    setErrorMsg(message)
    setSuccessMsg('')
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-4">
      {/* Mode toggle */}
      <div className="mb-4 flex justify-end">
        <ModeToggle mode={mode} onChange={handleModeChange} />
      </div>

      {successMsg && (
        <div className="mb-3 bg-green-50 border border-green-200 px-3 py-2.5 text-xs text-green-800">
          {successMsg}{' '}
          {getMainCalcOrigin() ? (
            <a
              href={`${getMainCalcOrigin()}/quotes.html`}
              className="underline ml-1"
            >
              Open My Quotes →
            </a>
          ) : null}
        </div>
      )}

      {errorMsg && (
        <div className="mb-3 bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {!getMainCalcOrigin() && typeof window !== 'undefined' && !window.opener && (
        <div className="mb-3 border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          To save quotes to <strong>My Quotes</strong> on the main calculator, open Delivery pricing from the main calculator header while signed in.
          (If you manage the delivery deployment, you can also set <code className="font-mono">NEXT_PUBLIC_MAIN_CALC_ORIGIN</code>.)
        </div>
      )}

      {getMainCalcOrigin() && !mainAccessToken && typeof window !== 'undefined' && !window.opener && (
        <div className="mb-3 border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700">
          To save quotes to <strong>My Quotes</strong> on the main calculator, open Delivery pricing from the Opus Calculator header while you are signed in (same browser).
        </div>
      )}

      {getMainCalcOrigin() && !mainAccessToken && typeof window !== 'undefined' && window.opener && (
        <div className="mb-3 border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-600">
          Linking to your main calculator session… you can generate a quote once this message clears.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]">
        {/* Left column: form */}
        <div className="space-y-4">
          {/* Project info */}
          <section className="border border-gray-200 bg-white p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Project Information</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Client Name"
                required
                placeholder="e.g. Acme Corp"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
              <Input
                label="Project Name"
                required
                placeholder="e.g. AI Automation Phase 1"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Client Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Any additional context for this quote..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 resize-none"
              />
            </div>
          </section>

          {/* Calculator form */}
          <section className="border border-gray-200 bg-white p-4">
            {mode === 'detailed' ? (
              <DetailedCalculator inputs={detailedInputs} onChange={setDetailedInputs} />
            ) : (
              <SimpleCalculator inputs={simpleInputs} onChange={setSimpleInputs} />
            )}

            {/* Requested Discount */}
            <div className="mt-7 pt-5 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Requested Discount</h3>
              <div className="flex items-center gap-2 max-w-[160px]">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={requestedDiscount || ''}
                  onChange={(e) => setRequestedDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right column: live summary + generate */}
        <div>
          <div className="lg:sticky lg:top-4 space-y-3">
            <SummaryPanel outputs={outputs} discount={requestedDiscount} />

            {!canGenerate && (
              <p className="text-xs text-center text-gray-400">
                Fill in Client Name and Project Name to generate a quote.
              </p>
            )}

            <GenerateQuoteButton
              mode={mode}
              inputs={mode === 'detailed' ? detailedInputs : simpleInputs}
              outputs={outputs}
              clientName={clientName}
              projectName={projectName}
              notes={notes}
              discount={requestedDiscount}
              disabled={!canGenerate}
              mainAccessToken={mainAccessToken}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
