/**
 * Deletes the authenticated user via Auth Admin API.
 *
 * Deploy (from project root, with Supabase CLI):
 *   supabase login
 *   supabase link --project-ref YOUR_PROJECT_REF
 *   supabase secrets set SERVICE_ROLE_KEY=xxxxx   # value = Dashboard → Project Settings → API → service_role (JWT)
 *   supabase functions deploy delete-account
 *
 * Names starting with SUPABASE_ are reserved; use SERVICE_ROLE_KEY for the service role JWT.
 * SUPABASE_URL is injected automatically in hosted Edge Functions.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Use POST' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.slice('Bearer '.length).trim()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({
        error:
          'Server misconfigured: set Edge Function secret SERVICE_ROLE_KEY to your service_role JWT (supabase secrets set SERVICE_ROLE_KEY=...). SUPABASE_* names are reserved by the CLI.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(token)

  if (userErr || !user) {
    return new Response(JSON.stringify({ error: userErr?.message || 'Invalid or expired session' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)

  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
