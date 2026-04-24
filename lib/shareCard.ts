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

let registeredHost: ShareCardHostHandle | null = null;
let hostWaiters: Array<(host: ShareCardHostHandle) => void> = [];

export function registerShareCardHost(host: ShareCardHostHandle | null) {
  registeredHost = host;
  if (host) {
    const waiters = hostWaiters;
    hostWaiters = [];
    waiters.forEach((fn) => fn(host));
  }
}

function getHost(timeoutMs = 1500): Promise<ShareCardHostHandle> {
  if (registeredHost) return Promise.resolve(registeredHost);
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
    // iOS supports `url` as a file:// path; Android reads `message` and
    // accepts the URL on share targets that support it. We pass both so
    // we degrade gracefully if the target doesn't support the image.
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
