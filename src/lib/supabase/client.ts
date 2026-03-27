import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a dummy client that won't crash during SSG/build
    // All operations will fail gracefully at runtime
    return createBrowserClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  return createBrowserClient<Database>(url, key)
}
