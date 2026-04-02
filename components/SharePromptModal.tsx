import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Share, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { Analytics } from '@/lib/analytics';

type ShareTrigger = 'post_log' | 'milestone';

interface SharePromptModalProps {
  visible: boolean;
  onDismiss: () => void;
  trigger: ShareTrigger;
  userId?: string;
  vanityUrl?: string;
  milestoneCount?: number;
  cheeseName?: string;
}

export default function SharePromptModal({
  visible,
  onDismiss,
  trigger,
  userId,
  vanityUrl,
  milestoneCount,
  cheeseName,
}: SharePromptModalProps) {
  useEffect(() => {
    if (visible) {
      Analytics.trackSharePromptShown(trigger, milestoneCount, userId);
    }
  }, [visible]);

  const appUrl = 'https://cheezus.app';

  const handleShare = async () => {
    Analytics.trackSharePromptTapped(trigger, userId);
    try {
      const shareMessage = cheeseName
        ? `Just added ${cheeseName} to my cheese box on Cheezus 🧀\n\n${appUrl}`
        : `Check out my cheese journey on Cheezus! 🧀\n\n${appUrl}`;
      const result = await Share.share({
        message: shareMessage,
        url: appUrl,
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

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share Cheese</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
            <Text style={styles.dismissButtonText}>Not Now</Text>
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
    marginBottom: 24,
    lineHeight: 20,
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
