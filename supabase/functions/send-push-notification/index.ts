// Supabase Edge Function to send push notifications
// Deploy with: supabase functions deploy send-push-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface NotificationPayload {
  record: {
    id: string
    user_id: string
    type: string
    title: string
    body: string
    data: Record<string, unknown>
  }
}

serve(async (req) => {
  try {
    const payload: NotificationPayload = await req.json()
    const { record } = payload

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check user's notification settings
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', record.user_id)
      .single()

    // Determine if push should be sent based on type and settings
    const shouldSendPush = checkPushSettings(record.type, settings)
    
    if (!shouldSendPush) {
      console.log('Push disabled for this notification type')
      return new Response(JSON.stringify({ sent: false, reason: 'disabled' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check quiet hours
    if (settings?.quiet_hours_enabled) {
      const now = new Date()
      const currentHour = now.getUTCHours()
      const startHour = parseInt(settings.quiet_hours_start?.split(':')[0] || '22')
      const endHour = parseInt(settings.quiet_hours_end?.split(':')[0] || '8')
      
      const isQuietTime = startHour > endHour
        ? (currentHour >= startHour || currentHour < endHour)
        : (currentHour >= startHour && currentHour < endHour)
      
      if (isQuietTime) {
        console.log('Quiet hours active, skipping push')
        return new Response(JSON.stringify({ sent: false, reason: 'quiet_hours' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Get user's push token
    const { data: tokenData } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', record.user_id)
      .single()

    if (!tokenData?.token) {
      console.log('No push token found for user')
      return new Response(JSON.stringify({ sent: false, reason: 'no_token' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Send push notification via Expo
    const pushMessage = {
      to: tokenData.token,
      sound: 'default',
      title: record.title,
      body: record.body,
      data: {
        ...record.data,
        type: record.type,
        notification_id: record.id,
      },
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pushMessage),
    })

    const result = await response.json()

    // Mark notification as push_sent
    await supabase
      .from('notifications')
      .update({ push_sent: true })
      .eq('id', record.id)

    console.log('Push sent successfully:', result)
    return new Response(JSON.stringify({ sent: true, result }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error sending push:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

function checkPushSettings(type: string, settings: any): boolean {
  // If no settings, default to enabled
  if (!settings) return true
  
  // Master toggle
  if (!settings.push_enabled) return false

  // Check by notification category
  const followTypes = ['follow']
  const badgeTypes = ['badge_earned', 'following_earned_badge']
  const socialTypes = ['following_logged_cheese', 'following_added_wishlist', 'cheese_copied', 'friend_milestone']
  const recommendationTypes = ['trending_cheese', 'similar_recommendation', 'new_from_producer', 'award_winner', 'seasonal_cheese', 'cheese_near_you']
  const reminderTypes = ['wishlist_reminder', 'inactive_nudge', 'weekly_leaderboard', 'milestone_approaching', 'streak_reminder']

  if (followTypes.includes(type)) return settings.push_follows !== false
  if (badgeTypes.includes(type)) return settings.push_badges !== false
  if (socialTypes.includes(type)) return settings.push_social_activity !== false
  if (recommendationTypes.includes(type)) return settings.push_recommendations !== false
  if (reminderTypes.includes(type)) return settings.push_reminders !== false

  // System notifications always go through
  if (type === 'system') return true
  if (type === 'cheese_approved') return true

  return true
}
