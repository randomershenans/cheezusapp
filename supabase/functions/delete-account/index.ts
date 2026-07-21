// Supabase Edge Function: permanently delete the calling user's account.
// Deploy with: supabase functions deploy delete-account
//
// Required by App Store Review Guideline 5.1.1(v): any app offering account
// creation must offer in-app account deletion. This cannot run client-side -
// RLS blocks a user from deleting their own auth record, and the service role
// key must never ship inside the app bundle.
//
// The caller is identified from their own JWT, never from the request body, so
// a user can only ever delete themselves.
//
// Two classes of data are handled differently:
//
//   PERSONAL  - rows that ARE the user (logs, wishlists, follows, settings).
//               Deleted outright.
//   CONTRIBUTED - shared catalogue content the user happened to author
//               (a cheese they added, a producer they own). The row survives;
//               only the attribution is nulled. Deleting these would destroy
//               shared data for every other user, which is not what account
//               deletion means.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// NOTE: analytics_user_engagement, cheese_types_canonical and producer_cheese_stats
// are VIEWS, not tables. They are deliberately absent from both lists below -
// PostgREST exposes no DELETE/PATCH verb for them, so including one would make
// every deletion attempt fail. They resolve automatically once the underlying
// base tables are handled.

/** Rows that constitute the user's personal data. Deleted. */
const PERSONAL: Array<{ table: string; column: string }> = [
  { table: 'cheese_box_entries', column: 'user_id' },
  { table: 'wishlists', column: 'user_id' },
  { table: 'saved_items', column: 'user_id' },
  { table: 'user_badges', column: 'user_id' },
  { table: 'user_taste_seed', column: 'user_id' },
  { table: 'user_preferences', column: 'user_id' },
  { table: 'user_privacy_settings', column: 'user_id' },
  { table: 'notification_settings', column: 'user_id' },
  { table: 'notifications', column: 'user_id' },
  { table: 'push_tokens', column: 'user_id' },
]

/** Shared content. Attribution nulled, row preserved. */
const CONTRIBUTED: Array<{ table: string; column: string }> = [
  { table: 'cheeses', column: 'added_by' },
  { table: 'cheese_types', column: 'added_by' },
  { table: 'producer_cheeses', column: 'added_by' },
  { table: 'producers', column: 'owner_id' },
  { table: 'shops', column: 'owner_id' },
  { table: 'article_topics', column: 'created_by' },
  { table: 'newsletters', column: 'created_by' },
  // analytics_events is pseudonymous once detached, and its FK is already
  // ON DELETE SET NULL by design, so nulling here keeps aggregate counts intact
  // while removing the link to a real person.
  { table: 'analytics_events', column: 'user_id' },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Identify the caller from their own token. Never trust a user id in the body.
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    const asUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await asUser.auth.getUser()

    if (userError || !user) {
      return json({ error: 'Invalid or expired session' }, 401)
    }

    const uid = user.id
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const failures: string[] = []

    // 1. Follows are two-directional and must be cleared from both sides, or the
    //    deleted user keeps appearing in other people's follower counts.
    for (const column of ['follower_id', 'following_id']) {
      const { error } = await admin.from('follows').delete().eq(column, uid)
      if (error) failures.push(`follows.${column}: ${error.message}`)
    }

    // 2. Personal data.
    for (const { table, column } of PERSONAL) {
      const { error } = await admin.from(table).delete().eq(column, uid)
      // A missing table or column is a schema drift problem worth surfacing,
      // not something to silently pass over on a compliance path.
      if (error) failures.push(`${table}.${column}: ${error.message}`)
    }

    // 3. Contributed content: keep the row, drop the attribution.
    for (const { table, column } of CONTRIBUTED) {
      const { error } = await admin
        .from(table)
        .update({ [column]: null })
        .eq(column, uid)
      if (error) failures.push(`${table}.${column} (anonymise): ${error.message}`)
    }

    // 4. The profile row itself.
    const { error: profileError } = await admin.from('profiles').delete().eq('id', uid)
    if (profileError) failures.push(`profiles: ${profileError.message}`)

    // If personal data could not be removed, do NOT delete the auth user. Leaving
    // an orphaned auth record is recoverable; orphaned personal rows with no owner
    // are not, and would mean telling the user their data was deleted when it wasn't.
    if (failures.length > 0) {
      console.error('[delete-account] aborting, cleanup failed:', failures)
      return json(
        {
          error: 'Account deletion could not be completed. No data was removed from your account.',
          details: failures,
        },
        500
      )
    }

    // 5. Finally the auth record. After this the JWT is dead.
    const { error: authError } = await admin.auth.admin.deleteUser(uid)
    if (authError) {
      console.error('[delete-account] auth user deletion failed:', authError)
      return json({ error: `Failed to delete account: ${authError.message}` }, 500)
    }

    console.log(`[delete-account] deleted user ${uid}`)
    return json({ success: true })
  } catch (err) {
    console.error('[delete-account] unexpected error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
