import { redirect } from 'next/navigation'

/** Saved quotes live in the main calculator (single `quotes` table). */
export default async function QuotesPage() {
  const main = String(process.env.NEXT_PUBLIC_MAIN_CALC_ORIGIN || '')
    .trim()
    .replace(/\/$/, '')
  if (main) {
    redirect(`${main}/quotes.html`)
  }
  redirect('/calculator')
}
