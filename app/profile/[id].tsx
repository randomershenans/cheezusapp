import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Lock, Share2 } from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Analytics } from '@/lib/analytics';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

import ProfileHero from '@/components/profile/ProfileHero';
import ProfileStatsTrio from '@/components/profile/ProfileStatsTrio';
import TopShelfGrid from '@/components/profile/TopShelfGrid';
import TasteFingerprint from '@/components/profile/TasteFingerprint';
import PassportMap from '@/components/profile/PassportMap';
import FeaturedBadges from '@/components/profile/FeaturedBadges';
import InstallOrFollowCTA, { StickyInstallBar } from '@/components/profile/InstallOrFollowCTA';

import {
  fetchPublicProfile,
  type PublicProfilePayload,
  type FeaturedBadge,
} from '@/lib/profile-service';

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [payload, setPayload] = useState<PublicProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<FeaturedBadge | null>(null);

  const isOwnProfile = user?.id === id;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const data = await fetchPublicProfile(id);
      if (!cancelled) {
        setPayload(data);
        setLoading(false);
      }
    })();

    Analytics.trackProfileView(id, user?.id);
    if (user && !isOwnProfile) {
      checkFollowStatus();
    }

    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  const checkFollowStatus = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', id)
        .maybeSingle();
      setIsFollowing(!!data);
    } catch (error) {
      console.error('[profile] follow status check failed', error);
    }
  };

  const handleToggleFollow = useCallback(async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to follow users.');
      return;
    }
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id);
        setIsFollowing(false);
        Analytics.trackUserUnfollow(id as string, user?.id);
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: id });
        setIsFollowing(true);
        Analytics.trackUserFollow(id as string, 'profile', user?.id);
      }
    } catch (error) {
      console.error('[profile] toggle follow failed', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  }, [id, isFollowing, user]);

  const handleShare = async () => {
    if (!payload?.profile) return;
    const p = payload.profile;
    const url = p.vanity_url
      ? `https://cheezus.co/@${p.vanity_url}`
      : `https://cheezus.co/profile/${p.id}`;
    try {
      const result = await Share.share({
        message: `${p.name || 'My'} cheese journey on Cheezus 🧀\n${url}`,
        url,
      });
      if (result.action === Share.sharedAction) {
        Analytics.trackProfileShare(result.activityType || 'unknown', user?.id);
      }
    } catch (e) {
      // user cancelled
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!payload?.profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { profile, stats, top_shelf, countries, flavor_fingerprint, featured_badges, tier } = payload;

  if (!profile.is_public && !isOwnProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} />
        <View style={styles.privateContainer}>
          <Lock size={48} color={Colors.subtleText} />
          <Text style={styles.privateTitle}>Private Profile</Text>
          <Text style={styles.privateSubtitle}>
            This user has chosen to keep their profile private
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[]}
      >
        {/* Hero — full-bleed, below the status bar */}
        <View>
          <ProfileHero
            name={profile.name}
            tagline={profile.tagline}
            location={profile.location}
            avatarUrl={profile.avatar_url}
            vanityUrl={profile.vanity_url}
            tier={tier}
          />

          {/* Floating back + share over the hero */}
          <SafeAreaView style={styles.heroOverlay} pointerEvents="box-none">
            <View style={styles.heroTopRow} pointerEvents="box-none">
              <TouchableOpacity onPress={() => router.back()} style={styles.circleButton}>
                <ArrowLeft size={22} color={Colors.text} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleShare} style={styles.circleButton}>
                <Share2 size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Stats trio — overlaps the hero by -28px */}
        <ProfileStatsTrio
          cheeseCount={stats.cheese_count}
          countryCount={stats.country_count}
          avgRating={stats.avg_rating}
        />

        {/* Follow / Share / Web Install CTA */}
        <InstallOrFollowCTA
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          followLoading={followLoading}
          onToggleFollow={handleToggleFollow}
          onShare={handleShare}
          profileName={profile.name}
          isLoggedIn={!!user}
        />

        {/* Top Shelf */}
        <TopShelfGrid
          cheeses={top_shelf}
          totalCheeseCount={stats.cheese_count}
          isOwnProfile={isOwnProfile}
        />

        {/* Taste Fingerprint */}
        <TasteFingerprint
          fingerprint={flavor_fingerprint}
          cheeseCount={stats.cheese_count}
        />

        {/* Passport */}
        <PassportMap countries={countries} />

        {/* Achievements */}
        <FeaturedBadges
          badges={featured_badges}
          onBadgePress={setSelectedBadge}
        />

        <View style={{ height: Layout.spacing.xxl }} />
      </ScrollView>

      {/* Sticky install bar (web only, no-op on native) */}
      {!user ? <StickyInstallBar profileName={profile.name} /> : null}

      {/* Badge detail modal */}
      <Modal
        visible={selectedBadge !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedBadge(null)}
        >
          <View style={styles.badgeModalContent}>
            {selectedBadge?.img_url ? (
              <Image source={{ uri: selectedBadge.img_url }} style={styles.badgeModalImage} resizeMode="contain" />
            ) : (
              <Text style={styles.badgeModalEmoji}>🏅</Text>
            )}
            <Text style={styles.badgeModalTitle}>{selectedBadge?.name}</Text>
            {selectedBadge?.description ? (
              <Text style={styles.badgeModalDescription}>{selectedBadge.description}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Layout.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.m,
    paddingTop: Layout.spacing.s,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 254, 247, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  ctaRow: {
    paddingHorizontal: Layout.spacing.m,
    marginTop: Layout.spacing.m,
  },
  followButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  followButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyBold,
    color: '#1F2937',
  },
  followingButtonText: {
    color: Colors.text,
  },
  privateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  privateTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginTop: Layout.spacing.m,
  },
  privateSubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    marginTop: Layout.spacing.s,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeModalContent: {
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.xl,
    alignItems: 'center',
    maxWidth: 300,
    width: '80%',
  },
  badgeModalImage: {
    width: 150,
    height: 150,
    marginBottom: Layout.spacing.m,
  },
  badgeModalEmoji: {
    fontSize: 80,
    marginBottom: Layout.spacing.m,
  },
  badgeModalTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.s,
  },
  badgeModalDescription: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
