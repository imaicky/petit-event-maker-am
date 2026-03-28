import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Service-role client for server-side operations that bypass RLS
 * (e.g. Storage uploads). NEVER expose this on the client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
