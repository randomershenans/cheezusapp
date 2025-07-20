import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Image, ScrollView, Platform, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ProfilePictureUpload from '../../components/ProfilePictureUpload';
import { useRouter } from 'expo-router';
import { User, ChevronRight, Heart, BookOpen, ChefHat, Settings, LogOut, Award, Star, Crown, Pencil, Trophy } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  progress: number;
  completed: boolean;
};

type Profile = {
  id: string;
  name: string | null;
  tagline: string | null;
  location: string | null;
  avatar_url: string | null;
  premium: boolean;
  created_at: string;
  updated_at: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  
  const navigateToSignup = () => {
    router.push('/auth/signup');
  };
  
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedTagline, setEditedTagline] = useState('');

  // Handle successful profile picture upload
  const handleProfilePictureSuccess = (avatarUrl: string) => {
    if (profile) {
      setProfile({
        ...profile,
        avatar_url: avatarUrl
      });
    }
    setShowUploadModal(false);
  };

  useEffect(() => {
    if (isEditing && profile) {
      setEditedName(profile.name || '');
      setEditedLocation(profile.location || '');
      setEditedTagline(profile.tagline || '');
    }
  }, [isEditing, profile]);

  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState({
    cheesesTried: 0,
    reviews: 0,
    following: 0,
    badgesEarned: 0
  });

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data);
        setEditedName(data.name || '');
        setEditedTagline(data.tagline || '');
        setEditedLocation(data.location || '');
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchBadges = async () => {
      try {
        const { data: userBadges, error: badgesError } = await supabase
          .from('user_badges')
          .select('*')
          .eq('user_id', user.id);
        if (badgesError) throw badgesError;

        const { data, error } = await supabase
          .rpc('get_user_badges_with_progress', { user_id: user.id });
        if (error) throw error;

        if (data && Array.isArray(data)) {
          const sortedBadges = data.sort((a, b) => {
            if (a.completed && !b.completed) return -1;
            if (!a.completed && b.completed) return 1;
            return (b.progress / b.threshold) - (a.progress / a.threshold);
          });
          setBadges(sortedBadges.slice(0, 5));
        } else {
          setBadges([]);
        }
      } catch (error) {
        console.error('Error fetching badges:', error);
        setBadges([]);
      }
    };
    fetchBadges();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      try {
        const { data: cheeseBoxData, count: cheesesCount, error: cheesesError } = await supabase
          .from('cheese_box_entries')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);
        if (cheesesError) throw cheesesError;

        const { count: reviewsCount, error: reviewsError } = await supabase
          .from('cheese_box_entries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .not('notes', 'is', null);
        if (reviewsError) throw reviewsError;

        const followingCount = 0; // placeholder

        const { data: badgesData, count: badgesCount, error: badgesError } = await supabase
          .from('user_badges')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('completed', true);
        if (badgesError) throw badgesError;

        const actualCheesesCount = cheesesCount ?? (cheeseBoxData?.length ?? 0);
        const actualBadgesCount = badgesCount ?? (badgesData?.length ?? 0);

        setStats({
          cheesesTried: actualCheesesCount,
          reviews: reviewsCount ?? 0,
          following: followingCount,
          badgesEarned: actualBadgesCount
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({
          cheesesTried: 0,
          reviews: 0,
          following: 0,
          badgesEarned: 0
        });
      }
    };
    fetchStats();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setIsEditing(false);
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editedName || profile?.name,
          tagline: editedTagline || profile?.tagline,
          location: editedLocation || profile?.location,
        })
        .eq('id', user.id);
      if (error) throw error;
      setProfile({
        ...profile,
        name: editedName || profile?.name,
        tagline: editedTagline || profile?.tagline,
        location: editedLocation || profile?.location,
      } as Profile);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content}>
          <View style={styles.heroSection}>
            <View style={styles.avatarPlaceholder}>
              <User size={40} color={Colors.subtleText} />
            </View>
            <Text style={styles.welcomeTitle}>Welcome to Cheezus</Text>
            <Text style={styles.welcomeText}>
              Join our community of cheese enthusiasts to track your tastings, share recommendations, and discover new cheeses.
            </Text>
          </View>
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>What you're missing out on</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#FFF0DB' }]}>
                  <ChefHat size={24} color={Colors.primary} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Personal Cheese Box</Text>
                  <Text style={styles.featureDescription}>Track and rate your cheese tastings</Text>
                </View>
                <ChevronRight size={20} color={Colors.subtleText} />
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#E8F4FF' }]}>
                  <BookOpen size={24} color="#0066CC" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Save Articles</Text>
                  <Text style={styles.featureDescription}>Build your cheese knowledge</Text>
                </View>
                <ChevronRight size={20} color={Colors.subtleText} />
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#FFE8EC' }]}>
                  <Heart size={24} color="#FF4D6A" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Favorite Recipes</Text>
                  <Text style={styles.featureDescription}>Save recipes for later</Text>
                </View>
                <ChevronRight size={20} color={Colors.subtleText} />
              </View>
            </View>
          </View>
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.signupButton} onPress={navigateToSignup}>
              <Text style={styles.signupButtonText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Logged-in profile view
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.profileHeaderClean}>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => setIsEditing(!isEditing)}>
            <Pencil size={20} color="#666666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton}>
            <Settings size={20} color="#666666" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileMainRow}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: profile?.avatar_url || 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg' }}
              style={styles.profileImage}
            />
            <TouchableOpacity style={styles.avatarEditButton} onPress={() => setShowUploadModal(true)}>
              <Pencil size={16} color="#FFFFFF" />
            </TouchableOpacity>
            {profile?.premium && (
              <View style={styles.premiumIndicator}>
                <Crown size={14} color={Colors.primary} />
              </View>
            )}
          </View>
          {isEditing ? (
            <View style={styles.editProfileContainer}>
              <TextInput
                style={styles.editNameInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Your name"
              />
              <TextInput
                style={styles.editLocationInput}
                value={editedLocation}
                onChangeText={setEditedLocation}
                placeholder="Your location"
              />
              <TextInput
                style={styles.editTaglineInput}
                value={editedTagline}
                onChangeText={setEditedTagline}
                placeholder="Your tagline"
                multiline
              />
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionCancelButton} onPress={() => setIsEditing(false)}>
                  <Text style={styles.actionCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionSaveButton} onPress={handleSaveProfile}>
                  <Text style={styles.actionSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.profileInfoBox}>
              <Text style={styles.profileName}>{profile?.name || 'Add your name'}</Text>
              <Text style={styles.profileLocation}>{profile?.location || 'Alsace, France'}</Text>
              <Text style={styles.profileBio}>{profile?.tagline || 'Cheese enthusiast'}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsCardContainer}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{safeNumber(stats.cheesesTried)}</Text>
            <Text style={styles.statLabel}>Cheeses Tried</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{safeNumber(stats.badgesEarned)}</Text>
            <Text style={styles.statLabel}>Badges Earned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{safeNumber(stats.following)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.profileContent} showsVerticalScrollIndicator={false}>
        <View style={styles.badgesSection}>
          <View style={styles.achievementHeader}>
            <Text style={styles.achievementTitle}>Achievements</Text>
            <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/badges')}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          {badges.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesContainer}>
              {badges.map((badge) => {
                const percentComplete = Math.min(100, (badge.progress / badge.threshold) * 100);
                let badgeColor = badge.completed ? '#FFF8D6' : '#FFF7E6';
                switch (badge.category) {
                  case 'quantity': badgeColor = '#FFF0E6'; break;
                  case 'specialty': badgeColor = '#F0E6FF'; break;
                  case 'type': badgeColor = '#E8FFFD'; break;
                  case 'origin': badgeColor = '#E8F4FF'; break;
                  case 'pairing': badgeColor = '#E8F8F0'; break;
                  case 'engagement': badgeColor = '#F0E6FF'; break;
                }
                return (
                  <TouchableOpacity key={badge.id} style={[styles.badgeCard, { backgroundColor: badgeColor }]} onPress={() => router.push('/badges')}>
                    <View style={styles.badgeIcon}>
                      <Text style={styles.badgeEmoji}>{badge.icon || '🏆'}</Text>
                    </View>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                    <Text style={styles.badgeDescription}>{badge.description}</Text>
                    <View style={styles.badgeProgressContainer}>
                      <View style={styles.badgeProgressBar}>
                        <View style={[styles.badgeProgressFill, { width: `${percentComplete}%`, backgroundColor: badge.completed ? '#FFD700' : '#3B82F6' }]} />
                      </View>
                      <Text style={styles.badgeProgressText}>{badge.progress}/{badge.threshold}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyBadges}>
              <Trophy size={40} color={Colors.subtleText} />
              <Text style={styles.emptyBadgesText}>Start your cheese journey to earn badges!</Text>
            </View>
          )}
        </View>

        {/* Leaderboard Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.card, { width: '100%' }]}>
            <View style={styles.achievementHeader}>
              <Trophy size={16} color={Colors.accent} />
              <Text style={styles.achievementTitle}>You're in the top 10 French cheese tasters!</Text>
            </View>
            {/* ... leaderboard rows ... */}
          </View>
          <View style={[styles.card, { width: '100%' }]}>
            <Text style={styles.achievementTitle}>Most Cheeses Logged This Month</Text>
            {/* ... monthly leaderboard ... */}
          </View>
        </View>

        {/* Refer-a-Friend Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Refer Friends & Earn Rewards</Text>
          <View style={[styles.card, { width: '100%' }]}>
            <View style={styles.referralBadgeContainer}>
              <Text style={styles.referralBadgeEmoji}>🎁</Text>
            </View>
            <Text style={styles.achievementTitle}>Share your love for cheese!</Text>
            <Text style={styles.referralDescription}>
              When friends sign up with your code and log their first cheese, you'll both earn the exclusive 'Cheese Connector' badge.
            </Text>
            <View style={styles.referralCodeContainer}>
              <Text style={styles.referralCode}>CHEEZ-{user.id.substring(0, 6).toUpperCase()}</Text>
              <TouchableOpacity style={styles.copyButton}>
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.shareButton}>
              <Text style={styles.shareButtonText}>Share Your Invite Link</Text>
            </TouchableOpacity>
            <Text style={styles.referralProgress}>🧀 3 friends joined • 2 more for special badge set!</Text>
          </View>
        </View>
      </ScrollView>

      <ProfilePictureUpload
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleProfilePictureSuccess}
        userId={user.id}
      />
    </SafeAreaView>
  );
}

// Helper to avoid NaN
const safeNumber = (value: number | null | undefined): number => {
  return typeof value === 'number' && !isNaN(value) ? value : 0;
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  content: {
    flex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 15,
    paddingRight: 10,
    zIndex: 0,
  },
  heroSection: {
    padding: Layout.spacing.xl,
    alignItems: 'center',
    zIndex: 0,
  },
  welcomeAvatarContainer: {
    marginBottom: Layout.spacing.l,
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  welcomeTitle: {
    fontSize: Typography.sizes['3xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
    textAlign: 'center',
    letterSpacing: Typography.letterSpacing.tight,
  },
  welcomeText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
  },
  featuresSection: {
    padding: Layout.spacing.xl,
    backgroundColor: '#F9F9F9',
  },
  featuresTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.l,
  },
  featuresList: {
    gap: Layout.spacing.m,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
    }),
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  actionSection: {
    padding: Layout.spacing.xl,
  },
  loginButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    marginBottom: Layout.spacing.m,
  },
  loginButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    textAlign: 'center',
  },
  signupButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: Layout.borderRadius.large,
    paddingVertical: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  signupButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    textAlign: 'center',
  },
  profileContent: {
    flex: 1,
  },
  statsCardContainer: {
    position: 'relative',
    zIndex: 50, // Lower z-index to avoid hiding profile content
    marginTop: 40, // Add more space below profile details
    marginBottom: 15,
    paddingHorizontal: Layout.spacing.m,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Layout.spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#EEEEEE',
  },
  profileHeaderClean: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 20,
    marginBottom: 15,
    position: 'relative',
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  avatarContainer: {
    width: '30%',
    alignItems: 'center',
    position: 'relative',
  },
  profileInfoBox: {
    width: '65%',
    paddingLeft: 10,
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'absolute',
    top: 20,
    right: 0,
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 12,
    borderRadius: 20,
  },
  profileAvatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#F5F5F5',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 5,
    backgroundColor: '#FCD95B',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  premiumIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  profileInfoContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  profileDetails: {
    flex: 1,
    marginTop: 10,
    paddingHorizontal: 2, // Add slight padding
    marginBottom: 5,
  },
  editProfileContainer: {
    flex: 1,
    marginTop: 10,
  },
  editNameInput: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  editLocationInput: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  editTaglineInput: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  actionCancelText: {
    color: '#666666',
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
  },
  actionSaveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionSaveText: {
    color: '#ffffff',
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
  },
  profileName: {
    fontSize: Typography.sizes.lg,
    fontFamily: Platform.OS === 'web' ? Typography.fonts.bodyBold : 'System',
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
    textAlign: 'left',
  },
  profileLocation: {
    fontSize: Typography.sizes.sm,
    fontFamily: Platform.OS === 'web' ? Typography.fonts.bodyMedium : 'System',
    fontWeight: '600',
    color: '#666666',
    marginBottom: 5,
    textAlign: 'left',
  },
  profileBio: {
    fontSize: Typography.sizes.xs,
    fontFamily: Platform.OS === 'web' ? Typography.fonts.body : 'System',
    color: '#2C3E50', // Force explicit color instead of using Colors.text
    marginTop: 2,
    textAlign: 'left',
  },

  badgesSection: {
    marginVertical: 20,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  achievementTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
  },
  accountSection: {
    padding: 20,
    marginTop: 15,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40, 
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingsItemText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  badgesContainer: {
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.s,
    gap: Layout.spacing.m,
  },
  // Section Styles
  section: {
    padding: 15,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  cardTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyBold,
    color: Colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  achievementBanner: {
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.accent,
    textAlign: 'center',
  },
  
  // Leaderboard Styles
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  highlightedRow: {
    backgroundColor: 'rgba(240, 248, 255, 0.5)',
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  leaderboardPosition: {
    width: 30,
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
    color: '#888',
    textAlign: 'center',
  },
  highlightedPosition: {
    color: Colors.primary,
  },
  leaderboardUser: {
    flex: 1,
    paddingLeft: 10,
  },
  leaderboardName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  highlightedName: {
    color: Colors.primary,
    fontFamily: Typography.fonts.bodyBold,
  },
  leaderboardDetail: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 2,
  },
  
  // Referral Styles
  referralContent: {
    alignItems: 'center',
  },
  referralBadgeContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  referralBadgeEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  referralDescription: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  referralCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    width: '100%',
    justifyContent: 'space-between',
  },
  referralCode: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    letterSpacing: 1,
  },
  referralCopyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  referralCopyButtonText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyBold,
    color: '#FFFFFF',
  },
  referralShareButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  referralShareButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyBold,
    color: '#FFFFFF',
  },
  referralProgress: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.accent,
    textAlign: 'center',
  },
  // Copy and Share buttons
  copyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyBold,
    color: '#FFFFFF',
  },
  shareButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  shareButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyBold,
    color: '#FFFFFF',
  },
  badgeCard: {
    width: 160,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
  },
  badgeName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.m,
    marginVertical: Layout.spacing.l,
    marginHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutText: {
    color: Colors.error,
    marginLeft: Layout.spacing.m,
    fontFamily: Typography.fonts.bodyMedium,
    fontSize: Typography.sizes.base,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: Colors.primary,
    fontFamily: Typography.fonts.bodyMedium,
    fontSize: Typography.sizes.sm,
    marginRight: 4,
  },
  badgeEmoji: {
    fontSize: 24,
    textAlign: 'center',
  },
  badgeProgressContainer: {
    marginTop: Layout.spacing.s,
    width: '100%',
  },
  badgeProgressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  badgeProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  badgeProgressText: {
    fontSize: Typography.sizes.xs,
    color: Colors.subtleText,
    fontFamily: Typography.fonts.body,
    textAlign: 'right',
  },
  emptyBadges: {
    padding: Layout.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBadgesText: {
    marginTop: Layout.spacing.m,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
  }
});