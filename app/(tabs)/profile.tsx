import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Image, ScrollView, Platform, TextInput, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { User, ChevronRight, Settings, Pencil, Trophy, Award, Star, Sparkles, Target } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import ProfilePictureUpload from '../../components/ProfilePictureUpload';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: screenWidth } = Dimensions.get('window');

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
  const { user, signOut } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedTagline, setEditedTagline] = useState('');
  
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState({
    cheesesTried: 0,
    reviews: 0,
    badgesEarned: 0,
  });
  const [savedCounts, setSavedCounts] = useState({
    articles: 0,
    recipes: 0,
    pairings: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchStats();
    fetchBadges();
    fetchSavedCounts();
    fetchRecentActivity();
  }, [user]);

  useEffect(() => {
    if (isEditing && profile) {
      setEditedName(profile.name || '');
      setEditedLocation(profile.location || '');
      setEditedTagline(profile.tagline || '');
    }
  }, [isEditing]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) setProfile(data);
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!user) return;
    try {
      const { count: cheesesCount } = await supabase
        .from('cheese_box_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: reviewsCount } = await supabase
        .from('cheese_box_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('notes', 'is', null);

      const { count: badgesCount } = await supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true);

      setStats({
        cheesesTried: cheesesCount ?? 0,
        reviews: reviewsCount ?? 0,
        badgesEarned: badgesCount ?? 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBadges = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .rpc('get_user_badges_with_progress', { user_id: user.id });

      if (data && Array.isArray(data)) {
        const sortedBadges = data.sort((a, b) => {
          if (a.completed && !b.completed) return -1;
          if (!a.completed && b.completed) return 1;
          return (b.progress / b.threshold) - (a.progress / a.threshold);
        });
        setBadges(sortedBadges.slice(0, 4));
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  };

  const fetchSavedCounts = async () => {
    if (!user) return;
    try {
      const { count: articlesCount } = await supabase
        .from('saved_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('item_type', 'article');

      const { count: recipesCount } = await supabase
        .from('saved_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('item_type', 'recipe');

      const { count: pairingsCount } = await supabase
        .from('saved_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('item_type', 'pairing');

      setSavedCounts({
        articles: articlesCount ?? 0,
        recipes: recipesCount ?? 0,
        pairings: pairingsCount ?? 0,
      });
    } catch (error) {
      console.error('Error fetching saved counts:', error);
    }
  };

  const fetchRecentActivity = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('cheese_box_entries')
        .select(`
          id,
          created_at,
          rating,
          notes,
          cheese:cheeses(name, type)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (data) {
        setRecentActivity(data);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editedName || null,
          tagline: editedTagline || null,
          location: editedLocation || null,
        })
        .eq('id', user.id);

      if (!error) {
        setProfile({
          ...profile,
          name: editedName || null,
          tagline: editedTagline || null,
          location: editedLocation || null,
        });
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleProfilePictureSuccess = (avatarUrl: string) => {
    if (profile) {
      setProfile({ ...profile, avatar_url: avatarUrl });
    }
    setShowUploadModal(false);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Not logged in view
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.loginHero}>
            <View style={styles.loginIconContainer}>
              <User size={48} color={Colors.primary} />
            </View>
            <Text style={styles.loginTitle}>Join Cheezus</Text>
            <Text style={styles.loginSubtitle}>
              Track your cheese journey, earn badges, and discover new favorites
            </Text>
          </View>

          <View style={styles.loginFeatures}>
            {[
              { icon: '🧀', title: 'Personal Cheese Box', desc: 'Track & rate every cheese' },
              { icon: '🏆', title: 'Earn Achievements', desc: 'Unlock badges & rewards' },
              { icon: '📚', title: 'Learn & Discover', desc: 'Expert pairings & guides' },
            ].map((feature, index) => (
              <View key={index} style={styles.loginFeatureCard}>
                <Text style={styles.loginFeatureIcon}>{feature.icon}</Text>
                <View style={styles.loginFeatureText}>
                  <Text style={styles.loginFeatureTitle}>{feature.title}</Text>
                  <Text style={styles.loginFeatureDesc}>{feature.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.loginActions}>
            <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth/signup')}>
              <Text style={styles.loginButtonText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.loginButtonSecondary} onPress={() => router.push('/auth/login')}>
              <Text style={styles.loginButtonSecondaryText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Logged in view
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                style={styles.avatarWrapper}
                onPress={() => setShowUploadModal(true)}
              >
                <Image
                  source={{ uri: profile?.avatar_url || 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg' }}
                  style={styles.avatar}
                />
                <View style={styles.avatarEditBadge}>
                  <Pencil size={12} color={Colors.background} />
                </View>
              </TouchableOpacity>
              
              {isEditing ? (
                <View style={styles.profileEditForm}>
                  <TextInput
                    style={styles.editInput}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Your name"
                    placeholderTextColor={Colors.subtleText}
                  />
                  <TextInput
                    style={[styles.editInput, styles.editInputSmall]}
                    value={editedLocation}
                    onChangeText={setEditedLocation}
                    placeholder="Location"
                    placeholderTextColor={Colors.subtleText}
                  />
                  <TextInput
                    style={[styles.editInput, styles.editInputMulti]}
                    value={editedTagline}
                    onChangeText={setEditedTagline}
                    placeholder="Tell us about your cheese journey..."
                    placeholderTextColor={Colors.subtleText}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              ) : (
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{profile?.name || 'Cheese Lover'}</Text>
                  {profile?.location && (
                    <Text style={styles.profileLocation}>📍 {profile.location}</Text>
                  )}
                  {profile?.tagline && (
                    <Text style={styles.profileTagline}>{profile.tagline}</Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.headerActions}>
              {isEditing ? (
                <>
                  <TouchableOpacity 
                    style={[styles.iconButton, styles.cancelButton]}
                    onPress={() => setIsEditing(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.iconButton, styles.saveButton]}
                    onPress={handleSaveProfile}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={() => setIsEditing(true)}
                  >
                    <Pencil size={20} color={Colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton}>
                    <Settings size={20} color={Colors.text} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.cheesesTried}</Text>
            <Text style={styles.statLabel}>Cheeses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.reviews}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.badgesEarned}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/badges')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {badges.length > 0 ? (
            <View style={styles.badgesGrid}>
              {badges.map((badge) => {
                const progress = Math.min(100, (badge.progress / badge.threshold) * 100);
                const categoryColors = {
                  quantity: ['#FFE5E5', '#FF6B6B'],
                  specialty: ['#F0E5FF', '#9B59B6'],
                  type: ['#E5F9FF', '#3498DB'],
                  origin: ['#FFF5E5', '#F39C12'],
                  pairing: ['#E5FFE9', '#27AE60'],
                  engagement: ['#FFE5F5', '#E91E63'],
                };
                const [bgColor, accentColor] = categoryColors[badge.category as keyof typeof categoryColors] || ['#F5F5F5', '#666'];

                return (
                  <TouchableOpacity 
                    key={badge.id} 
                    style={[styles.badgeCard, { backgroundColor: bgColor }]}
                    onPress={() => router.push('/badges')}
                  >
                    <View style={styles.badgeTop}>
                      <View style={[styles.badgeIconCircle, { backgroundColor: accentColor }]}>
                        <Text style={styles.badgeEmoji}>{badge.icon || '🏆'}</Text>
                      </View>
                      {badge.completed && (
                        <View style={styles.completedBadge}>
                          <Sparkles size={12} color="#FFD700" fill="#FFD700" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                    <Text style={styles.badgeDesc} numberOfLines={2}>{badge.description}</Text>
                    
                    {!badge.completed && (
                      <View style={styles.badgeProgress}>
                        <View style={styles.progressBar}>
                          <View 
                            style={[styles.progressFill, { 
                              width: `${progress}%`,
                              backgroundColor: accentColor 
                            }]} 
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {badge.progress}/{badge.threshold}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Trophy size={48} color={Colors.subtleText} />
              <Text style={styles.emptyStateText}>Start tasting to unlock badges!</Text>
            </View>
          )}
        </View>

        {/* Saved Collection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Saved Collection</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.collectionGrid}>
            <View style={styles.collectionCard}>
              <View style={[styles.collectionIcon, { backgroundColor: '#FFF5E5' }]}>
                <Text style={styles.collectionEmoji}>📚</Text>
              </View>
              <Text style={styles.collectionNumber}>{savedCounts.articles}</Text>
              <Text style={styles.collectionLabel}>Articles</Text>
            </View>
            <View style={styles.collectionCard}>
              <View style={[styles.collectionIcon, { backgroundColor: '#FFE5F5' }]}>
                <Text style={styles.collectionEmoji}>🍽️</Text>
              </View>
              <Text style={styles.collectionNumber}>{savedCounts.recipes}</Text>
              <Text style={styles.collectionLabel}>Recipes</Text>
            </View>
            <View style={styles.collectionCard}>
              <View style={[styles.collectionIcon, { backgroundColor: '#E5F9FF' }]}>
                <Text style={styles.collectionEmoji}>🍷</Text>
              </View>
              <Text style={styles.collectionNumber}>{savedCounts.pairings}</Text>
              <Text style={styles.collectionLabel}>Pairings</Text>
            </View>
          </View>
          <Text style={styles.collectionHint}>
            💡 Tap the bookmark icon on articles and recipes to save them here
          </Text>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/(tabs)/cheese-box')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          {recentActivity.length > 0 ? (
            <View style={styles.activityList}>
              {recentActivity.map((activity, index) => {
                const cheese = activity.cheese as any;
                const date = new Date(activity.created_at);
                const timeAgo = formatTimeAgo(date);
                
                return (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={styles.activityIconCircle}>
                      <Text style={styles.activityEmoji}>🧀</Text>
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>
                        Tried {cheese?.name || 'a cheese'}
                      </Text>
                      <Text style={styles.activityDate}>
                        {activity.rating ? `⭐ ${activity.rating}/5 • ` : ''}{timeAgo}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {stats.badgesEarned > 0 && (
                <View style={styles.activityItem}>
                  <View style={styles.activityIconCircle}>
                    <Text style={styles.activityEmoji}>🏆</Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Achievement unlocked!</Text>
                    <Text style={styles.activityDate}>
                      {stats.badgesEarned} {stats.badgesEarned === 1 ? 'badge' : 'badges'} earned
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Start tasting to see your activity!</Text>
            </View>
          )}
        </View>

        {/* Settings & Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings & Account</Text>
          
          <View style={styles.settingsList}>
            <TouchableOpacity 
              style={styles.settingsItem}
              onPress={() => router.push('/settings/account')}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: '#E5F9FF' }]}>
                  <User size={20} color="#3498DB" />
                </View>
                <Text style={styles.settingsText}>Account Details</Text>
              </View>
              <ChevronRight size={20} color={Colors.subtleText} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem}>
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: '#FFF5E5' }]}>
                  <Settings size={20} color="#F39C12" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsText}>Preferences</Text>
                  <Text style={styles.settingsSubtext}>Coming Soon</Text>
                </View>
              </View>
              <ChevronRight size={20} color={Colors.subtleText} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsItem}>
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: '#FFE5E5' }]}>
                  <Text style={styles.settingsEmoji}>🔒</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsText}>Privacy & Security</Text>
                  <Text style={styles.settingsSubtext}>Coming Soon</Text>
                </View>
              </View>
              <ChevronRight size={20} color={Colors.subtleText} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.settingsItem, styles.settingsItemLast]}
              onPress={signOut}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: '#FFF0F0' }]}>
                  <Text style={styles.settingsEmoji}>👋</Text>
                </View>
                <Text style={[styles.settingsText, { color: Colors.error }]}>Sign Out</Text>
              </View>
              <ChevronRight size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Layout.spacing.xl,
  },

  // Login View
  loginHero: {
    paddingHorizontal: Layout.spacing.xl,
    paddingTop: Layout.spacing['2xl'],
    paddingBottom: Layout.spacing.xl,
    alignItems: 'center',
  },
  loginIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.l,
  },
  loginTitle: {
    fontSize: Typography.sizes['3xl'],
    fontFamily: Typography.fonts.bodyBold,
    color: Colors.text,
    marginBottom: Layout.spacing.s,
  },
  loginSubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: 24,
  },
  loginFeatures: {
    paddingHorizontal: Layout.spacing.l,
    gap: Layout.spacing.m,
    marginBottom: Layout.spacing.xl,
  },
  loginFeatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Layout.spacing.l,
    borderRadius: Layout.borderRadius.large,
    ...Layout.shadow.small,
  },
  loginFeatureIcon: {
    fontSize: 32,
    marginRight: Layout.spacing.m,
  },
  loginFeatureText: {
    flex: 1,
  },
  loginFeatureTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: 2,
  },
  loginFeatureDesc: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  loginActions: {
    paddingHorizontal: Layout.spacing.xl,
    gap: Layout.spacing.m,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    ...Layout.shadow.medium,
  },
  loginButtonText: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
  },
  loginButtonSecondary: {
    backgroundColor: Colors.card,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loginButtonSecondaryText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },

  // Profile Header
  profileHeader: {
    paddingHorizontal: Layout.spacing.l,
    paddingTop: Layout.spacing.xl,
    paddingBottom: Layout.spacing.l,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Layout.spacing.m,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bodyBold,
    color: Colors.text,
    marginBottom: 4,
  },
  profileLocation: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
    marginBottom: 4,
  },
  profileTagline: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    lineHeight: 20,
  },
  profileEditForm: {
    flex: 1,
    gap: Layout.spacing.s,
  },
  editInput: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    backgroundColor: Colors.card,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editInputSmall: {
    fontSize: Typography.sizes.sm,
  },
  editInputMulti: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Layout.spacing.s,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  cancelButton: {
    paddingHorizontal: Layout.spacing.m,
    width: 'auto',
  },
  cancelButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.m,
    width: 'auto',
  },
  saveButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.l,
    gap: Layout.spacing.m,
    marginBottom: Layout.spacing.l,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  statNumber: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.bodyBold,
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },

  // Sections
  section: {
    paddingHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bodyBold,
    color: Colors.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.primary,
  },

  // Badges Grid
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.m,
  },
  badgeCard: {
    width: (screenWidth - Layout.spacing.l * 2 - Layout.spacing.m) / 2,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    ...Layout.shadow.small,
  },
  badgeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Layout.spacing.s,
  },
  badgeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  badgeName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: 4,
  },
  badgeDesc: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    lineHeight: 16,
    marginBottom: Layout.spacing.s,
  },
  badgeProgress: {
    marginTop: Layout.spacing.s,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
    textAlign: 'right',
  },
  emptyState: {
    paddingVertical: Layout.spacing['2xl'],
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: Layout.spacing.m,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },

  // Saved Collection
  collectionGrid: {
    flexDirection: 'row',
    gap: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
  },
  collectionCard: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  collectionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
  },
  collectionEmoji: {
    fontSize: 28,
  },
  collectionNumber: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.bodyBold,
    color: Colors.text,
    marginBottom: 2,
  },
  collectionLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  collectionHint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Recent Activity
  activityList: {
    gap: Layout.spacing.m,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    ...Layout.shadow.small,
  },
  activityIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  activityEmoji: {
    fontSize: 24,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: 2,
  },
  activityDate: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },

  // Settings
  settingsList: {
    gap: Layout.spacing.s,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    ...Layout.shadow.small,
  },
  settingsItemLast: {
    marginTop: Layout.spacing.m,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  settingsEmoji: {
    fontSize: 20,
  },
  settingsText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  settingsSubtext: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 2,
  },
});
