import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { STORIES_WIDTH, STORIES_HEIGHT } from './shared';
import JustLoggedCard, { type JustLoggedCardProps } from './JustLoggedCard';
import MilestoneCard, { type MilestoneCardProps } from './MilestoneCard';
import ProfileCard, { type ProfileCardProps } from './ProfileCard';
import BadgeCard, { type BadgeCardProps } from './BadgeCard';
import TasteResultCard, { type TasteResultCardProps } from './TasteResultCard';
import type { ShareCardType } from '@/lib/shareCard';

interface Props {
  cardType: ShareCardType;
  props: any;
  /** Visible width of the preview container in dp. */
  width: number;
  borderRadius?: number;
}

/**
 * Scaled preview of a share card. Uses the same card component as the capture
 * pipeline so WYSIWYG is guaranteed. Cards are authored at 1080x1920 and we
 * scale them down uniformly to fit `width`, preserving the 9:16 ratio.
 */
export default function ShareCardPreview({ cardType, props, width, borderRadius = 20 }: Props) {
  const scale = width / STORIES_WIDTH;
  const height = STORIES_HEIGHT * scale;

  const inner = renderCard(cardType, props);

  return (
    <View
      style={{
        width,
        height,
        borderRadius,
        overflow: 'hidden',
        backgroundColor: '#FFFEF7',
      }}
    >
      <View
        style={{
          width: STORIES_WIDTH,
          height: STORIES_HEIGHT,
          transform: [{ scale }],
          transformOrigin: 'top left',
        }}
        pointerEvents="none"
      >
        {inner}
      </View>
    </View>
  );
}

function renderCard(cardType: ShareCardType, props: any): ReactNode {
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
}
