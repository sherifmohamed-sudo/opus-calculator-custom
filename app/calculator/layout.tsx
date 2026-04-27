import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function mainQuotesUrl(): string {
  const o = String(process.env.NEXT_PUBLIC_MAIN_CALC_ORIGIN || '')
    .trim()
    .replace(/\/$/, '')
  if (!o) return '/quotes'
  return `${o}/quotes.html`
}

async function NavBar() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const quotesHref = mainQuotesUrl()
    return (
      <nav className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex h-12 items-center justify-between">
            <div className="flex items-center gap-5">
              <Link href="/calculator" className="flex items-center gap-2.5">
                <img src="/OpusLogo.png" alt="Opus" className="h-6 w-auto" />
              </Link>
              <div className="hidden sm:flex items-center gap-1">
                <Link
                  href="/calculator/pricing-guide"
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  Pricing Guide
                </Link>
                <Link
                  href="/calculator"
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  Calculator
                </Link>
                <a
                  href={quotesHref}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  My Quotes
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', session.user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const displayName = profile?.full_name || profile?.email || session.user.email

  return (
    <nav className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <div className="flex h-12 items-center justify-between">
          <div className="flex items-center gap-5">
            <Link href="/calculator" className="flex items-center gap-2.5">
              <img src="/OpusLogo.png" alt="Opus" className="h-6 w-auto" />
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              <Link
                href="/calculator/pricing-guide"
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                Pricing Guide
              </Link>
              <Link
                href="/calculator"
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                Calculator
              </Link>
              <a
                href={mainQuotesUrl()}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                My Quotes
              </a>
              {isAdmin && (
                <>
                  <Link
                    href="/admin"
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
                  >
                    Admin
                  </Link>
                  <Link
                    href="/admin/gm"
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
                  >
                    GM Calculator
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:block">{displayName}</span>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default async function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main>{children}</main>
    </div>
  )
}
