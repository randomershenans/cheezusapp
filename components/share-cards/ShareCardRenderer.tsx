import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  ReactNode,
} from 'react';
import { View, StyleSheet, PixelRatio } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import {
  STORIES_WIDTH,
  STORIES_HEIGHT,
  FEED_WIDTH,
  FEED_HEIGHT,
} from './shared';

export type ShareCardFormat = 'stories' | 'feed';

export interface ShareCardRendererHandle {
  /**
   * Capture the hosted card to a tmpfile PNG and return its URI.
   * Rendering is offscreen; callers can share the URI via the Share API
   * or expo-sharing.
   */
  capture: (options?: { format?: ShareCardFormat }) => Promise<string>;
}

interface Props {
  /** The rendered card tree. Should be sized to 1080x1920. */
  children: ReactNode;
  /** Force a specific format size when laying out the host. Defaults to stories. */
  format?: ShareCardFormat;
}

/**
 * Offscreen host for share cards. Renders the card tree in a visually hidden,
 * pointer-events-disabled View that is still laid out (so `captureRef`
 * can rasterize it).
 *
 * The capture is pinned to a fixed pixel size (1080x1920 or 1080x1080) so
 * the output is device-independent. `captureRef` receives the width/height
 * directly — it renders the view at logical size and scales to the target.
 */
const ShareCardRenderer = forwardRef<ShareCardRendererHandle, Props>(
  ({ children, format = 'stories' }, ref) => {
    const viewRef = useRef<View>(null);

    useImperativeHandle(ref, () => ({
      capture: async (options) => {
        const fmt = options?.format ?? format;
        const width = fmt === 'feed' ? FEED_WIDTH : STORIES_WIDTH;
        const height = fmt === 'feed' ? FEED_HEIGHT : STORIES_HEIGHT;
        if (!viewRef.current) {
          throw new Error('ShareCardRenderer: view not mounted');
        }
        // Ask the native layer to render the view at the target output size.
        // We render the logical card at 1080x1920 layout units; view-shot
        // will rasterize at the requested pixel size. Multiplying by
        // PixelRatio would push the file beyond social-platform image
        // size caps — 1080px wide is already the Instagram/IG Stories
        // native resolution and looks crisp on any device.
        const uri = await captureRef(viewRef.current, {
          format: 'png',
          quality: 1,
          width,
          height,
          result: 'tmpfile',
        });
        return uri;
      },
    }));

    const width = format === 'feed' ? FEED_WIDTH : STORIES_WIDTH;
    const height = format === 'feed' ? FEED_HEIGHT : STORIES_HEIGHT;

    return (
      <View
        ref={viewRef}
        collapsable={false}
        pointerEvents="none"
        style={[
          styles.host,
          { width, height },
        ]}
      >
        {children}
      </View>
    );
  }
);

ShareCardRenderer.displayName = 'ShareCardRenderer';

// Reference PixelRatio to keep import alive for future DPR tuning.
void PixelRatio;

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: -99999,
    top: 0,
    opacity: 0,
  },
});

export default ShareCardRenderer;
