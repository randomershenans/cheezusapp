import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Share, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { Analytics } from '@/lib/analytics';

const MILESTONES = [5, 10, 25, 50, 100] as const;

export type MilestoneNumber = (typeof MILESTONES)[number];

interface MilestoneSharePromptProps {
  visible: boolean;
  onDismiss: () => void;
  milestoneCount: MilestoneNumber;
  userId?: string;
  vanityUrl?: string;
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
}: MilestoneSharePromptProps) {
  useEffect(() => {
    if (visible) {
      Analytics.trackSharePromptShown('milestone', milestoneCount, userId);
      markMilestoneShown(milestoneCount);
    }
  }, [visible]);

  const profileUrl = vanityUrl
    ? `https://cheezus.app/${vanityUrl}`
    : 'https://cheezus.app';

  const handleShare = async () => {
    Analytics.trackSharePromptTapped('milestone', userId);
    try {
      const result = await Share.share({
        message: `I've logged ${milestoneCount} cheeses on Cheezus! Follow my cheese journey: ${profileUrl}`,
        url: profileUrl,
      });
      if (result.action === Share.sharedAction) {
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

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share Your Journey</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
            <Text style={styles.dismissButtonText}>Keep Going</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    marginBottom: 16,
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
    marginBottom: 24,
    lineHeight: 21,
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
