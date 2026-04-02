import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Share, StyleSheet } from 'react-native';
import { Share2, X } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { Analytics } from '@/lib/analytics';

interface ShareProfileCardProps {
  followerCount: number;
  userId: string;
  vanityUrl?: string | null;
}

export default function ShareProfileCard({
  followerCount,
  userId,
  vanityUrl,
}: ShareProfileCardProps) {
  const [dismissed, setDismissed] = useState(false);

  const profileUrl = vanityUrl
    ? `https://cheezus.app/@${vanityUrl}`
    : `https://cheezus.app/profile/${userId}`;

  useEffect(() => {
    if (followerCount === 0 && !dismissed) {
      Analytics.trackSharePromptShown('zero_followers', undefined, userId);
    }
  }, [followerCount, dismissed]);

  if (followerCount > 0 || dismissed) {
    return null;
  }

  const handleShare = async () => {
    Analytics.trackSharePromptTapped('zero_followers', userId);
    try {
      const result = await Share.share({
        message: `Check out my cheese journey on Cheezus! \u{1F9C0} ${profileUrl}`,
        url: profileUrl,
      });
      if (result.action === Share.sharedAction) {
        Analytics.trackProfileShare(result.activityType || 'unknown', userId);
      }
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const handleDismiss = () => {
    Analytics.trackSharePromptDismissed('zero_followers', userId);
    setDismissed(true);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
        <X size={18} color={Colors.subtleText} />
      </TouchableOpacity>

      <Text style={styles.emoji}>{'\u{1F9C0}'}</Text>
      <Text style={styles.title}>Get your first follower!</Text>
      <Text style={styles.subtitle}>
        Share your profile and start building your cheese community
      </Text>

      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Share2 size={18} color="#1F2937" style={styles.shareIcon} />
        <Text style={styles.shareButtonText}>Share Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFEF7',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.subtleText,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
  },
  shareIcon: {
    marginRight: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
});
