import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Admin is centralized on the main Opus Pricing Calculator (admin.html).
 * When NEXT_PUBLIC_MAIN_CALC_ORIGIN is set, all /admin traffic goes there.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const main = String(process.env.NEXT_PUBLIC_MAIN_CALC_ORIGIN || '')
    .trim()
    .replace(/\/$/, '')
  if (main) {
    redirect(`${main}/admin.html`)
  }

  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/calculator')
  }

  return <>{children}</>
}
