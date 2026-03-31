import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 'next' is optional — redirect destination after login
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if this is a LINE Login — save line_user_id to profiles
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const provider = user.app_metadata?.provider
            const lineUserId = user.user_metadata?.sub || user.user_metadata?.provider_id

            if (provider === 'line' && lineUserId) {
              const admin = createAdminClient()
              await admin
                .from('profiles')
                .update({ line_user_id: lineUserId })
                .eq('id', user.id)

              // Auto-match with existing line_followers record
              await admin
                .from('line_followers')
                .update({ display_name: user.user_metadata?.name ?? null })
                .eq('line_user_id', lineUserId)
            }
          }
        } catch (err) {
          console.error('[auth/callback] LINE user_id save error:', err)
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        // In development, trust the origin from the request
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        // In production behind a reverse proxy, use the forwarded host
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return to the login page with an error if code exchange failed
  return NextResponse.redirect(`${origin}/auth/error`)
}
