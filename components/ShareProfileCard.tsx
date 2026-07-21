import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Share2, X } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { Analytics } from '@/lib/analytics';
import { generateAndShare } from '@/lib/shareCard';
import ShareCardHost from '@/components/share-cards/ShareCardHost';
import ShareCardPreview from '@/components/share-cards/ShareCardPreview';
import { fetchPublicProfile, type PublicProfilePayload } from '@/lib/profile-service';

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
  const [profileData, setProfileData] = useState<PublicProfilePayload | null>(null);

  useEffect(() => {
    if (followerCount === 0 && !dismissed) {
      Analytics.trackSharePromptShown('zero_followers', undefined, userId);
    }
  }, [followerCount, dismissed]);

  // Load public profile payload so the card has real photos + stats.
  useEffect(() => {
    let cancelled = false;
    if (followerCount > 0 || dismissed) return;
    (async () => {
      try {
        const data = await fetchPublicProfile(userId);
        if (!cancelled) setProfileData(data);
      } catch {
        // Card will fall back to a minimal state.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, followerCount, dismissed]);

  if (followerCount > 0 || dismissed) {
    return null;
  }

  const topCheesePhotos = (profileData?.top_shelf ?? []).map((c) => c.image_url);
  const topCountry = profileData?.countries?.[0]?.country ?? null;
  // Best available "top style" — use strongest flavor-fingerprint axis
  const topStyle =
    profileData?.flavor_fingerprint
      ? (Object.entries(profileData.flavor_fingerprint)
          .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] ?? null)
      : null;

  const cardProps = {
    userName: profileData?.profile?.name ?? null,
    userHandle: vanityUrl ?? null,
    userAvatarUrl: profileData?.profile?.avatar_url ?? null,
    userId,
    cheeseCount: profileData?.stats?.cheese_count ?? 0,
    countryCount: profileData?.stats?.country_count ?? 0,
    topFamily: null,
    topStyle,
    topCountry,
    tagline: profileData?.profile?.tagline ?? null,
    topCheesePhotos,
    vanityUrl,
  };

  const handleShare = async () => {
    Analytics.trackSharePromptTapped('zero_followers', userId);
    try {
      const result = await generateAndShare('profile', cardProps);
      if (result.shared) {
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

      <View style={styles.previewWrap}>
        <ShareCardPreview cardType="profile" props={cardProps} width={220} />
      </View>

      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Share2 size={18} color="#1F2937" style={styles.shareIcon} />
        <Text style={styles.shareButtonText}>Share Profile</Text>
      </TouchableOpacity>

      {/* Offscreen host for generateAndShare. */}
      <ShareCardHost />
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
    marginBottom: 16,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  previewWrap: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
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
