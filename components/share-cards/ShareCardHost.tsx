import React, { useEffect, useRef, useState, useCallback } from 'react';
import ShareCardRenderer, {
  ShareCardRendererHandle,
  ShareCardFormat,
} from './ShareCardRenderer';
import {
  registerShareCardHost,
  type ShareCardType,
  type ShareCardHostHandle,
} from '@/lib/shareCard';
import JustLoggedCard, { type JustLoggedCardProps } from './JustLoggedCard';
import MilestoneCard, { type MilestoneCardProps } from './MilestoneCard';
import ProfileCard, { type ProfileCardProps } from './ProfileCard';
import BadgeCard, { type BadgeCardProps } from './BadgeCard';
import TasteResultCard, { type TasteResultCardProps } from './TasteResultCard';

/**
 * Mount this anywhere in the tree (once per screen that wants to call
 * `generateAndShare`). It hosts an offscreen `ShareCardRenderer` and
 * registers a callable handle with the `lib/shareCard` module so
 * `generateAndShare` can find it.
 *
 * Intentionally render-on-demand: the card tree only exists between
 * setPending() and the next capture, so there's no constant layout cost.
 */
export default function ShareCardHost() {
  const rendererRef = useRef<ShareCardRendererHandle>(null);
  const [pending, setPending] = useState<{
    cardType: ShareCardType;
    props: any;
    format: ShareCardFormat;
    resolve: (uri: string) => void;
    reject: (err: Error) => void;
  } | null>(null);

  const generate = useCallback<ShareCardHostHandle['generate']>(
    (cardType, props, options) => {
      return new Promise<string>((resolve, reject) => {
        setPending({
          cardType,
          props,
          format: options?.format ?? 'stories',
          resolve,
          reject,
        });
      });
    },
    []
  );

  // When `pending` changes, after React commits the new card tree, try the capture.
  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    // Two frames: one for mount, one for layout — especially important so
    // the renderer has real dimensions before `captureRef` runs.
    const t = setTimeout(async () => {
      if (cancelled) return;
      try {
        if (!rendererRef.current) throw new Error('renderer not ready');
        const uri = await rendererRef.current.capture({ format: pending.format });
        pending.resolve(uri);
      } catch (err) {
        pending.reject(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setPending(null);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pending]);

  useEffect(() => {
    const handle: ShareCardHostHandle = { generate };
    registerShareCardHost(handle);
    return () => {
      registerShareCardHost(null);
    };
  }, [generate]);

  const renderCard = () => {
    if (!pending) return null;
    const { cardType, props } = pending;
    switch (cardType) {
      case 'just_logged':
        return <JustLoggedCard {...(props as JustLoggedCardProps)} />;
      case 'milestone':
        return <MilestoneCard {...(props as MilestoneCardProps)} />;
      case 'profile':
        return <ProfileCard {...(props as ProfileCardProps)} />;
      case 'badge':
        return <BadgeCard {...(props as BadgeCardProps)} />;
      case 'taste_result':
        return <TasteResultCard {...(props as TasteResultCardProps)} />;
    }
  };

  return (
    <ShareCardRenderer ref={rendererRef} format={pending?.format ?? 'stories'}>
      {renderCard()}
    </ShareCardRenderer>
  );
}
