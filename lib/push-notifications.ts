import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * ASKING FOR PUSH PERMISSION IS A ONE-SHOT. SPEND IT WELL.
 *
 * This file used to expose a single function that checked permission and, if
 * it did not have it, immediately raised the OS dialog. It was called from a
 * useEffect that ran the moment a user object existed, which is app launch. So
 * the very first thing a new person saw, before they knew what Cheezus was,
 * was iOS asking whether this unfamiliar app could send them notifications.
 *
 * On iOS that question can only be asked once. A "no" is permanent and can
 * only be undone by the person going to Settings themselves, which nobody
 * does. 21% of accounts have a push token, and that number is the ceiling on
 * every re-engagement idea we might ever have.
 *
 * So the two things are now separate:
 *   syncPushTokenIfGranted  never prompts, safe to call on launch
 *   requestPushPermission   prompts, and is only called from a moment where
 *                           the person has just seen the app do something
 *                           worth being notified about
 */

/**
 * Whether we have already shown our own primer.
 *
 * Separate from the OS permission state on purpose. Someone who taps "Not now"
 * on our screen never reaches the OS dialog, so canAskForPermission stays true
 * and they would be asked again on every single log. One ask, then leave them
 * alone. Matches the milestone tracking pattern.
 */
const PUSH_PRIMER_KEY = 'cheezus_push_primer_shown';

export async function hasAskedForPush(): Promise<boolean> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return (await AsyncStorage.getItem(PUSH_PRIMER_KEY)) === '1';
  } catch {
    // Storage unavailable: treat as already asked. Better to miss the prompt
    // than to show it on a loop.
    return true;
  }
}

export async function markAskedForPush(): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(PUSH_PRIMER_KEY, '1');
  } catch {
    // Non-critical.
  }
}

/** Whether the OS will still show a prompt. False once answered either way. */
export async function canAskForPushPermission(): Promise<boolean> {
  if (Platform.OS === 'web' || !Device.isDevice) return false;
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return status !== 'granted' && canAskAgain;
  } catch {
    return false;
  }
}

/**
 * Keep the stored token fresh for people who have ALREADY granted permission.
 * Never prompts, so this is safe to call on every launch. Tokens rotate, so
 * without this a granted user can silently become unreachable.
 */
export async function syncPushTokenIfGranted(userId: string): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;
  } catch {
    return null;
  }
  return registerToken(userId);
}

/**
 * Raise the OS prompt, then register on success. Call this only from a primed
 * moment, never cold.
 */
export async function requestPushPermission(userId: string): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }
  } catch (error) {
    console.log('Push permission request failed:', (error as Error).message);
    return null;
  }

  return registerToken(userId);
}

/** Fetch the Expo token and store it. Assumes permission is already granted. */
async function registerToken(userId: string): Promise<string | null> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    // Skip if no projectId configured
    if (!projectId) {
      console.log('Push notifications: No projectId configured. Skipping token registration.');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    // Save token to database
    await savePushToken(userId, token.data);

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FCD95B',
      });
    }

    return token.data;
  } catch (error) {
    // Don't show error for missing projectId - it's expected in dev
    console.log('Push notifications not available:', (error as Error).message);
    return null;
  }
}

/**
 * Save push token to database
 */
async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    // Upsert the token (update if exists, insert if not)
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) throw error;
    console.log('Push token saved successfully');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Remove push token (on logout)
 */
export async function removePushToken(userId: string): Promise<void> {
  try {
    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId);
    console.log('Push token removed');
  } catch (error) {
    console.error('Error removing push token:', error);
  }
}

/**
 * Set up notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) {
  // When notification is received while app is foregrounded
  const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);

  // When user taps on notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Get the notification that opened the app (if any)
 */
export async function getInitialNotification(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

/**
 * Update badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  seconds: number = 1
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
  });
}
