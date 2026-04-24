import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { Analytics } from '@/lib/analytics';
import { generateAndShare } from '@/lib/shareCard';
import ShareCardHost from '@/components/share-cards/ShareCardHost';
import ShareCardPreview from '@/components/share-cards/ShareCardPreview';

type ShareTrigger = 'post_log' | 'milestone';

interface SharePromptModalProps {
  visible: boolean;
  onDismiss: () => void;
  trigger: ShareTrigger;
  userId?: string;
  vanityUrl?: string;
  milestoneCount?: number;
  cheeseName?: string;
  // Extra data for the visual card. Optional so existing call-sites keep working.
  producerName?: string | null;
  originCountry?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  note?: string | null;
  userName?: string | null;
  userHandle?: string | null;
  userAvatarUrl?: string | null;
}

export default function SharePromptModal({
  visible,
  onDismiss,
  trigger,
  userId,
  vanityUrl,
  milestoneCount,
  cheeseName,
  producerName,
  originCountry,
  imageUrl,
  rating,
  note,
  userName,
  userHandle,
  userAvatarUrl,
}: SharePromptModalProps) {
  useEffect(() => {
    if (visible) {
      Analytics.trackSharePromptShown(trigger, milestoneCount, userId);
    }
  }, [visible]);

  const cardProps = {
    cheeseName: cheeseName || 'this cheese',
    producerName,
    originCountry,
    imageUrl,
    rating,
    note,
    userName,
    userHandle: userHandle || vanityUrl,
    userAvatarUrl,
    userId,
    vanityUrl,
  };

  const handleShare = async () => {
    Analytics.trackSharePromptTapped(trigger, userId);
    try {
      const result = await generateAndShare('just_logged', cardProps);
      if (result.shared) {
        Analytics.trackProfileShare(result.activityType || 'unknown', userId);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
    onDismiss();
  };

  const handleDismiss = () => {
    Analytics.trackSharePromptDismissed(trigger, userId);
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
          <Text style={styles.emoji}>🧀</Text>
          <Text style={styles.title}>Share this cheese!</Text>
          <Text style={styles.subtitle}>
            {cheeseName ? `Tell a friend about ${cheeseName}.` : 'Tell a friend about your latest find.'}
          </Text>

          {/* Card preview */}
          {visible && cheeseName ? (
            <View style={styles.previewWrap}>
              <ShareCardPreview cardType="just_logged" props={cardProps} width={220} />
            </View>
          ) : null}

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share Cheese</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
            <Text style={styles.dismissButtonText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Offscreen host so generateAndShare has somewhere to render into. */}
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
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.subtleText,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
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
