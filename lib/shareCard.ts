/**
 * Public share-card API.
 *
 * `generateAndShare(cardType, props, options)` renders one of the share-card
 * components into an offscreen host, captures it to a PNG via
 * `react-native-view-shot`, and invokes the native Share sheet with the
 * resulting file URI. On capture error it falls back to a text share so the
 * user always has a path forward.
 *
 * Usage: a consumer (modal, screen, etc.) must mount `<ShareCardHost />`
 * in its tree (see `components/share-cards/ShareCardHost.tsx`). That host
 * auto-registers with this module so calls to `generateAndShare` can target
 * it without prop-drilling.
 */
import { Share, Platform } from 'react-native';
// Required for Android image sharing - RN's own Share cannot attach files there.
import * as Sharing from 'expo-sharing';
import { Analytics } from '@/lib/analytics';
import type { ShareCardFormat } from '@/components/share-cards/ShareCardRenderer';

export type ShareCardType =
  | 'just_logged'
  | 'milestone'
  | 'profile'
  | 'badge'
  | 'taste_result';

export type ShareCardHostHandle = {
  generate: (
    cardType: ShareCardType,
    props: any,
    options?: { format?: ShareCardFormat }
  ) => Promise<string>;
};

// Hosts form a STACK: the most recently mounted one is active, which matches the UI
// (a modal mounts over a screen and should own rendering while it is up).
//
// This was a single slot cleared unconditionally on unmount, which broke whenever two
// hosts coexisted. Concretely: the profile screen mounts a host unconditionally via
// ShareProfileCard; opening a milestone or share modal over it registered a second host,
// and DISMISSING that modal wrote null - wiping the slot even though the profile's host
// was still mounted and never re-registers. Every later profile share then stalled for
// the full 1500ms timeout and silently degraded to a text-only share.
let hostStack: ShareCardHostHandle[] = [];
let hostWaiters: Array<(host: ShareCardHostHandle) => void> = [];

function activeHost(): ShareCardHostHandle | null {
  return hostStack.length ? hostStack[hostStack.length - 1] : null;
}

/**
 * Register a host. Returns its own unregister function - call THAT on unmount rather
 * than passing null, because null cannot say which host went away.
 */
export function registerShareCardHost(host: ShareCardHostHandle | null): () => void {
  if (!host) return () => {};
  hostStack.push(host);
  const waiters = hostWaiters;
  hostWaiters = [];
  waiters.forEach((fn) => fn(host));
  return () => {
    const i = hostStack.lastIndexOf(host);
    if (i !== -1) hostStack.splice(i, 1);
  };
}

function getHost(timeoutMs = 1500): Promise<ShareCardHostHandle> {
  const current = activeHost();
  if (current) return Promise.resolve(current);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      hostWaiters = hostWaiters.filter((w) => w !== wrap);
      reject(new Error('ShareCardHost not mounted'));
    }, timeoutMs);
    const wrap = (h: ShareCardHostHandle) => {
      clearTimeout(timer);
      resolve(h);
    };
    hostWaiters.push(wrap);
  });
}

function buildFallbackText(cardType: ShareCardType, props: any): { message: string; url?: string } {
  const url = props?.vanityUrl
    ? `https://cheezus.co/@${props.vanityUrl}`
    : 'https://cheezus.co';
  switch (cardType) {
    case 'just_logged':
      return {
        message: props?.cheeseName
          ? `Just added ${props.cheeseName} to my cheese box on Cheezus 🧀\n\n${url}`
          : `Check out my cheese journey on Cheezus! 🧀\n\n${url}`,
        url,
      };
    case 'milestone':
      return {
        message: `I've logged ${props?.milestone ?? ''} cheeses on Cheezus! Follow my cheese journey: ${url}`,
        url,
      };
    case 'profile':
      return {
        message: `Check out my cheese journey on Cheezus! 🧀 ${url}`,
        url,
      };
    case 'badge':
      return {
        message: `Just earned the "${props?.badgeName ?? 'new'}" badge on Cheezus 🧀 ${url}`,
        url,
      };
    case 'taste_result':
      return {
        message: `My cheese taste: ${props?.tagline ?? 'figuring it out'}. Find yours on Cheezus 🧀 ${url}`,
        url,
      };
  }
}

export interface GenerateAndShareResult {
  shared: boolean;
  activityType?: string;
  error?: string;
}

export async function generateAndShare(
  cardType: ShareCardType,
  props: any,
  options?: { format?: ShareCardFormat }
): Promise<GenerateAndShareResult> {
  const userId: string | undefined = props?.userId ?? undefined;
  const variant = options?.format ?? 'stories';

  let imageUri: string | null = null;

  try {
    const host = await getHost();
    imageUri = await host.generate(cardType, props, options);
    Analytics.trackShareCardRendered(cardType, variant, userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Analytics.trackShareCardRenderFailed(cardType, message, userId);
    // Fall through to text-only share
    try {
      const fb = buildFallbackText(cardType, props);
      const result = await Share.share({ message: fb.message, url: fb.url });
      if (result.action === Share.sharedAction) {
        const activityType = result.activityType || 'unknown';
        Analytics.trackShareCardImageShared(cardType, activityType, variant, userId);
        return { shared: true, activityType, error: message };
      }
      return { shared: false, error: message };
    } catch (e2) {
      return {
        shared: false,
        error: e2 instanceof Error ? e2.message : String(e2),
      };
    }
  }

  // Share with the rendered image
  try {
    const fb = buildFallbackText(cardType, props);

    // Android cannot attach the image via React Native's Share at all: its Android
    // implementation reads only `title` and `message` and ignores `url` entirely. This
    // previously passed fb.url (the WEB url, not even the image), so Android users have
    // never received a card - only text.
    //
    // expo-sharing is the only API that can put the PNG on the Android sheet. It accepts
    // file:// URIs ONLY (SharingModule rejects any other scheme), and view-shot's
    // tmpfile result is already file:///data/..., so the prefix guard is belt-and-braces.
    //
    // Deliberately wrapped so that ANY failure falls through to the text share below.
    // Without that, an expo-sharing throw would leave the user with nothing at all,
    // which is worse than today's text-only behaviour.
    if (Platform.OS === 'android' && imageUri) {
      try {
        if (await Sharing.isAvailableAsync()) {
          const fileUri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;
          await Sharing.shareAsync(fileUri, {
            mimeType: 'image/png',
            dialogTitle: 'Share your cheese card',
          });
          // NOTE: expo-sharing resolves when the chooser closes, whether or not the user
          // actually shared - Android does not report the outcome. This activityType is
          // therefore deliberately distinct so downstream metrics (profile_share and
          // friends) can exclude unconfirmed Android shares rather than silently
          // inflating a growth-loop number.
          Analytics.trackShareCardImageShared(cardType, 'android_sheet_unconfirmed', variant, userId);
          return { shared: true, activityType: 'android_sheet_unconfirmed' };
        }
      } catch {
        // Fall through to the text share.
      }
    }

    // iOS supports `url` as a file:// path and attaches the image properly.
    const result = await Share.share(
      {
        message: fb.message,
        url: Platform.OS === 'ios' ? imageUri ?? fb.url : fb.url,
      } as any
    );
    if (result.action === Share.sharedAction) {
      const activityType = result.activityType || 'unknown';
      Analytics.trackShareCardImageShared(cardType, activityType, variant, userId);
      return { shared: true, activityType };
    }
    return { shared: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { shared: false, error: message };
  }
}
