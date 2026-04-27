import { redirect } from 'next/navigation'

/**
 * Auth is centralized on the main Opus Pricing Calculator.
 * This delivery tool is opened from the main header and uses a token handoff
 * for saving quotes into the shared database.
 */
export default function LoginPage() {
  redirect('/calculator')
}
