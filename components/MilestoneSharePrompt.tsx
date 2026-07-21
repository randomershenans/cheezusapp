import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { Analytics } from '@/lib/analytics';
import { generateAndShare } from '@/lib/shareCard';
import ShareCardHost from '@/components/share-cards/ShareCardHost';
import ShareCardPreview from '@/components/share-cards/ShareCardPreview';
import { supabase } from '@/lib/supabase';

const MILESTONES = [5, 10, 25, 50, 100] as const;

export type MilestoneNumber = (typeof MILESTONES)[number];

interface MilestoneSharePromptProps {
  visible: boolean;
  onDismiss: () => void;
  milestoneCount: MilestoneNumber;
  userId?: string;
  vanityUrl?: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
}

/**
 * Check if a cheese count is exactly a milestone number.
 * Returns the milestone number if it matches, or null otherwise.
 */
export function checkMilestone(cheeseCount: number): MilestoneNumber | null {
  if ((MILESTONES as readonly number[]).includes(cheeseCount)) {
    return cheeseCount as MilestoneNumber;
  }
  return null;
}

/**
 * Milestone tracking with AsyncStorage to avoid re-showing milestones.
 */
const MILESTONE_STORAGE_KEY = 'cheezus_shown_milestones';

export async function hasShownMilestone(milestone: MilestoneNumber): Promise<boolean> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const stored = await AsyncStorage.getItem(MILESTONE_STORAGE_KEY);
    if (!stored) return false;
    const shown: number[] = JSON.parse(stored);
    return shown.includes(milestone);
  } catch {
    return false;
  }
}

export async function markMilestoneShown(milestone: MilestoneNumber): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const stored = await AsyncStorage.getItem(MILESTONE_STORAGE_KEY);
    const shown: number[] = stored ? JSON.parse(stored) : [];
    if (!shown.includes(milestone)) {
      shown.push(milestone);
      await AsyncStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify(shown));
    }
  } catch {
    // Silently fail — milestone tracking is non-critical
  }
}

function getMilestoneEmoji(count: MilestoneNumber): string {
  switch (count) {
    case 5: return '🧀';
    case 10: return '🏆';
    case 25: return '🌟';
    case 50: return '👑';
    case 100: return '🎉';
    default: return '🧀';
  }
}

function getMilestoneMessage(count: MilestoneNumber): string {
  switch (count) {
    case 5: return "You're on your way!";
    case 10: return 'Double digits — nice taste!';
    case 25: return "A true cheese explorer!";
    case 50: return "Half a century of cheeses!";
    case 100: return "Welcome to the Cheese Hall of Fame!";
    default: return "What a milestone!";
  }
}

export default function MilestoneSharePrompt({
  visible,
  onDismiss,
  milestoneCount,
  userId,
  vanityUrl,
  userName,
  userAvatarUrl,
}: MilestoneSharePromptProps) {
  const [cheesePhotos, setCheesePhotos] = useState<Array<{ url: string | null; name?: string | null }>>([]);

  useEffect(() => {
    if (visible) {
      Analytics.trackSharePromptShown('milestone', milestoneCount, userId);
      markMilestoneShown(milestoneCount);
    }
  }, [visible]);

  // Fetch 4 cheese photos for the grid. Uses top-rated for 25+, most-recent otherwise.
  useEffect(() => {
    if (!visible || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const orderByTopRated = milestoneCount >= 25;
        const query = supabase
          .from('cheese_box_entries')
          .select(
            'rating, created_at, cheese_id, producer_cheese:producer_cheeses!cheese_id(image_url, full_name)'
          )
          .eq('user_id', userId)
          .limit(4);
        const { data } = orderByTopRated
          ? await query.not('rating', 'is', null).order('rating', { ascending: false })
          : await query.order('created_at', { ascending: false });
        if (cancelled) return;
        const photos = (data ?? []).map((r: any) => ({
          url: r.producer_cheese?.image_url ?? null,
          name: r.producer_cheese?.full_name ?? null,
        }));
        setCheesePhotos(photos);
      } catch {
        // Non-fatal — card will render with placeholders.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, userId, milestoneCount]);

  const cardProps = {
    milestone: milestoneCount,
    cheesePhotos,
    userName,
    userHandle: vanityUrl,
    userAvatarUrl,
    userId,
    vanityUrl,
  };

  const handleShare = async () => {
    Analytics.trackSharePromptTapped('milestone', userId);
    try {
      const result = await generateAndShare('milestone', cardProps);
      if (result.shared) {
        Analytics.trackProfileShare(result.activityType || 'unknown', userId);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
    onDismiss();
  };

  const handleDismiss = () => {
    Analytics.trackSharePromptDismissed('milestone', userId);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.emoji}>{getMilestoneEmoji(milestoneCount)}</Text>
          <Text style={styles.title}>
            You've logged {milestoneCount} cheeses!
          </Text>
          <Text style={styles.subtitle}>
            {getMilestoneMessage(milestoneCount)}
          </Text>

          {/* Card preview */}
          {visible ? (
            <View style={styles.previewWrap}>
              <ShareCardPreview cardType="milestone" props={cardProps} width={240} />
            </View>
          ) : null}

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share Your Journey</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
            <Text style={styles.dismissButtonText}>Keep Going</Text>
          </TouchableOpacity>
        </View>
      </View>
      {visible ? <ShareCardHost /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.subtleText,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 21,
  },
  previewWrap: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  shareButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  dismissButton: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 15,
    color: Colors.subtleText,
    fontWeight: '500',
  },
});
