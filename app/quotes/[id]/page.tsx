import { redirect } from 'next/navigation'

export default async function QuoteDetailPage() {
  const main = String(process.env.NEXT_PUBLIC_MAIN_CALC_ORIGIN || '')
    .trim()
    .replace(/\/$/, '')
  if (main) {
    redirect(`${main}/quotes.html`)
  }
  redirect('/calculator')
}
