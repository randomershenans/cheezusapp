/**
 * Permanent account deletion.
 *
 * Required by App Store Review Guideline 5.1.1(v). Shared by both entry points
 * (settings/account.tsx and settings/privacy.tsx) so the two cannot drift apart
 * again - they were previously duplicated stubs.
 *
 * The actual deletion happens in the `delete-account` edge function, because a
 * client can neither delete its own auth record nor hold the service role key.
 * This module handles the provider-side teardown that MUST happen on the device,
 * then signs out.
 */
import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';

// Deliberately NOT a discriminated union. This project compiles with `strict`
// unset (so strictNullChecks is off), and TypeScript cannot narrow a union on a
// boolean literal without it - `if (!result.success) result.message` fails to
// compile. A flat optional field works under either setting.
export type DeleteAccountResult = { success: boolean; message?: string };

/**
 * Deletes the signed-in user's account and all their personal data.
 *
 * Order matters. The server deletion runs FIRST: if it fails, the user still has
 * an account and a valid session, and we surface a real error rather than
 * stranding them signed-out with their data intact.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { success: false, message: 'You are not signed in.' };
  }

  const provider = session.user.app_metadata?.provider;

  // 1. Server-side deletion of all rows plus the auth record.
  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });

  if (error) {
    console.error('[deleteAccount] edge function failed:', error);
    return {
      success: false,
      message:
        'We could not delete your account just now. Your data has not been changed. Please try again, or contact support if this keeps happening.',
    };
  }

  if (data && data.success !== true) {
    console.error('[deleteAccount] edge function reported failure:', data);
    return {
      success: false,
      message:
        typeof data.error === 'string'
          ? data.error
          : 'Account deletion did not complete. Your data has not been changed.',
    };
  }

  // 2. Revoke the Google grant so the app no longer appears in the user's
  //    Google account permissions. Best-effort: the account is already gone
  //    server-side, so a failure here must not be reported as a failed deletion.
  if (provider === 'google' && Platform.OS !== 'web') {
    try {
      await GoogleSignin.revokeAccess();
    } catch (err) {
      console.warn('[deleteAccount] Google revokeAccess failed:', err);
    }
  }

  // 3. Clear the local session. The JWT is already dead server-side; this drops
  //    the cached copy and resets the app to its signed-out state.
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('[deleteAccount] signOut after deletion failed:', err);
  }

  return { success: true };
}
