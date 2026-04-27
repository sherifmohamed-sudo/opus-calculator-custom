/**
 * Cross-window handoff: main Opus Calculator (parent) sends a Supabase access
 * token so this app can POST to the main deployment's /api/save-delivery-quote.
 */

export const DELIVERY_AUTH_REQUEST = 'DELIVERY_AUTH_REQUEST'
export const MAIN_AUTH_DELIVERY = 'MAIN_AUTH_DELIVERY'

function safeOriginFromUrl(u: unknown): string {
  try {
    const s = String(u || '').trim()
    if (!s) return ''
    return new URL(s).origin
  } catch {
    return ''
  }
}

/**
 * If env var isn't available (you don't control delivery Vercel env),
 * infer the main origin from:
 * - `window.opener.location.origin` (when opened from main header), or
 * - `document.referrer` (fallback).
 */
export function inferMainCalcOriginFromWindow(): string {
  if (typeof window === 'undefined') return ''

  try {
    // Only works when opener is same-origin accessible.
    // In our flow, opener is the main calculator and delivery is cross-origin,
    // so direct access may throw — that's why we also use referrer.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openerOrigin = (window.opener as any)?.location?.origin as string | undefined
    if (openerOrigin) return String(openerOrigin).trim().replace(/\/$/, '')
  } catch {
    // ignore
  }

  const refOrigin = safeOriginFromUrl(document.referrer)
  return refOrigin.trim().replace(/\/$/, '')
}

export function getMainCalcOrigin(): string {
  const env = String(process.env.NEXT_PUBLIC_MAIN_CALC_ORIGIN || '')
    .trim()
    .replace(/\/$/, '')
  return env || inferMainCalcOriginFromWindow()
}

export function getSaveDeliveryQuoteUrl(): string {
  const origin = getMainCalcOrigin()
  if (!origin) return ''
  return `${origin}/api/save-delivery-quote`
}

export function requestAccessTokenFromOpener(): void {
  if (typeof window === 'undefined' || !window.opener) return
  const targetOrigin = getMainCalcOrigin()
  if (!targetOrigin) return
  window.opener.postMessage(
    { type: DELIVERY_AUTH_REQUEST },
    targetOrigin,
  )
}

export function subscribeMainAccessToken(
  onToken: (accessToken: string) => void,
): () => void {
  const expectedOrigin = getMainCalcOrigin()
  const handler = (ev: MessageEvent) => {
    if (expectedOrigin && ev.origin !== expectedOrigin) return
    if (!ev.data || ev.data.type !== MAIN_AUTH_DELIVERY || !ev.data.access_token) return
    onToken(String(ev.data.access_token))
  }
  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}
