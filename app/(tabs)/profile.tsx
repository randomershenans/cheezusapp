import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Image, ScrollView, Platform, TextInput, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { User, ChevronRight, Settings, Pencil, Trophy, Award, Star, Sparkles, Target, Users, Share2 } from 'lucide-react-native';
import { Share } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import ProfilePictureUpload from '../../components/ProfilePictureUpload';
import NotificationBell from '@/components/NotificationBell';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const { width: screenWidth } = Dimensions.get('window');

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  img_url?: string;
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
  vanity_url: string | null;
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
  const [isEditingVanityUrl, setIsEditingVanityUrl] = useState(false);
  const [editedVanityUrl, setEditedVanityUrl] = useState('');
  const [vanityUrlError, setVanityUrlError] = useState('');
  
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
  const [followCounts, setFollowCounts] = useState({
    followers: 0,
    following: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchStats();
    fetchBadges();
    fetchSavedCounts();
    fetchRecentActivity();
    fetchFollowCounts();
  }, [user]);

  // Refresh counts when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchSavedCounts();
        fetchFollowCounts();
      }
    }, [user])
  );

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
        // Show all completed badges first, then top in-progress ones
        const completed = data.filter(b => b.completed).sort((a, b) => 
          // Sort by category to group legacy badges first
          a.category === 'legacy' ? -1 : b.category === 'legacy' ? 1 : 0
        );
        const inProgress = data
          .filter(b => !b.completed)
          .sort((a, b) => (b.progress / b.threshold) - (a.progress / a.threshold))
          .slice(0, 4); // Show top 4 in-progress
        setBadges([...completed, ...inProgress]);
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

  const fetchFollowCounts = async () => {
    if (!user) return;
    try {
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

      setFollowCounts({
        followers: followersCount ?? 0,
        following: followingCount ?? 0,
      });
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  };

  const fetchRecentActivity = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('cheese_box_entries')
        .select(`
          id,
          cheese_id,
          created_at,
          rating,
          notes,
          producer_cheese:producer_cheeses(
            id,
            full_name, 
            producer_name, 
            product_name,
            cheese_type:cheese_types(name)
          )
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

  const handleShareProfile = async () => {
    if (!user || !profile) return;
    try {
      const displayName = profile.name || 'Cheese Lover';
      const profileUrl = profile.vanity_url 
        ? `https://cheezus.co/@${profile.vanity_url}`
        : `https://cheezus.co/profile/${user.id}`;
      await Share.share({
        message: `Check out ${displayName}'s cheese journey on Cheezus! 🧀\n\n${profileUrl}`,
        title: `${displayName} on Cheezus`,
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const validateVanityUrl = (url: string): boolean => {
    // Only allow lowercase letters, numbers, and underscores
    const regex = /^[a-z0-9_]{3,20}$/;
    return regex.test(url);
  };

  const handleSaveVanityUrl = async () => {
    if (!user || !profile) return;
    
    const cleanUrl = editedVanityUrl.toLowerCase().trim();
    
    if (!cleanUrl) {
      // Allow clearing the vanity URL
      try {
        await supabase
          .from('profiles')
          .update({ vanity_url: null })
          .eq('id', user.id);
        
        setProfile({ ...profile, vanity_url: null });
        setIsEditingVanityUrl(false);
        setVanityUrlError('');
      } catch (error) {
        setVanityUrlError('Failed to update');
      }
      return;
    }

    if (!validateVanityUrl(cleanUrl)) {
      setVanityUrlError('3-20 characters, letters, numbers, underscores only');
      return;
    }

    try {
      // Check if already taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('vanity_url', cleanUrl)
        .neq('id', user.id)
        .maybeSingle();

      if (existing) {
        setVanityUrlError('This URL is already taken');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ vanity_url: cleanUrl })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, vanity_url: cleanUrl });
      setIsEditingVanityUrl(false);
      setVanityUrlError('');
    } catch (error) {
      console.error('Error saving vanity URL:', error);
      setVanityUrlError('Failed to save');
    }
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
      
      {/* Top Bar with Notification */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profile</Text>
        <NotificationBell />
      </View>

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
                  <Pencil size={12} color="#1F2937" />
                </View>
              </TouchableOpacity>
              
              {!isEditing && (
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
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Pencil size={20} color={Colors.text} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {isEditing && (
            <View style={styles.profileEditForm}>
              <TextInput
                style={styles.editInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Your name"
                placeholderTextColor={Colors.subtleText}
              />
              <TextInput
                style={styles.editInput}
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
                numberOfLines={3}
              />
            </View>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/(tabs)/cheese-box')}
          >
            <Text style={styles.statNumber}>{stats.cheesesTried}</Text>
            <Text style={styles.statLabel}>Cheeses</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/(tabs)/cheese-box')}
          >
            <Text style={styles.statNumber}>{stats.reviews}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/badges')}
          >
            <Text style={styles.statNumber}>{stats.badgesEarned}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </TouchableOpacity>
        </View>

        {/* Followers/Following */}
        <View style={styles.followRow}>
          <TouchableOpacity 
            style={styles.followCard}
            onPress={() => router.push('/followers?tab=followers')}
          >
            <Users size={18} color={Colors.primary} />
            <Text style={styles.followNumber}>{followCounts.followers}</Text>
            <Text style={styles.followLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.followCard}
            onPress={() => router.push('/followers?tab=following')}
          >
            <Users size={18} color={Colors.primary} />
            <Text style={styles.followNumber}>{followCounts.following}</Text>
            <Text style={styles.followLabel}>Following</Text>
          </TouchableOpacity>
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
              <ChevronRight size={16} color="#FCD95B" />
            </TouchableOpacity>
          </View>

          {badges.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesRow}
            >
              {badges.map((badge) => {
                const progress = Math.min(100, (badge.progress / badge.threshold) * 100);

                return (
                  <TouchableOpacity 
                    key={badge.id} 
                    style={styles.badgeCircleContainer}
                    onPress={() => router.push('/badges')}
                  >
                    {/* Badge circle with border indicating progress */}
                    <View style={[
                      styles.badgeCircle,
                      badge.completed ? styles.badgeCircleCompleted : styles.badgeCircleInProgress
                    ]}>
                      {badge.img_url ? (
                        <Image source={{ uri: badge.img_url }} style={styles.badgeImageLarge} resizeMode="cover" />
                      ) : (
                        <Text style={styles.badgeEmojiLarge}>{badge.icon || '🏆'}</Text>
                      )}
                    </View>
                    
                    {/* Stars for completed */}
                    {badge.completed && (
                      <View style={styles.starsContainer}>
                        <Star size={10} color="#FFD700" fill="#FFD700" />
                        <Star size={12} color="#FFD700" fill="#FFD700" style={{ marginHorizontal: 1 }} />
                        <Star size={10} color="#FFD700" fill="#FFD700" />
                      </View>
                    )}
                    
                    {/* Progress text for incomplete */}
                    {!badge.completed && (
                      <Text style={styles.badgeProgressText}>
                        {badge.progress}/{badge.threshold}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/saved-items')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color="#FCD95B" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.collectionGrid}>
            <TouchableOpacity 
              style={styles.collectionCard}
              onPress={() => router.push('/saved-items')}
            >
              <View style={[styles.collectionIcon, { backgroundColor: '#FFF5E5' }]}>
                <Text style={styles.collectionEmoji}>📚</Text>
              </View>
              <Text style={styles.collectionNumber}>{savedCounts.articles}</Text>
              <Text style={styles.collectionLabel}>Articles</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.collectionCard}
              onPress={() => router.push('/saved-items')}
            >
              <View style={[styles.collectionIcon, { backgroundColor: '#FFE5F5' }]}>
                <Text style={styles.collectionEmoji}>🍽️</Text>
              </View>
              <Text style={styles.collectionNumber}>{savedCounts.recipes}</Text>
              <Text style={styles.collectionLabel}>Recipes</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.collectionCard}
              onPress={() => router.push('/saved-items')}
            >
              <View style={[styles.collectionIcon, { backgroundColor: '#E5F9FF' }]}>
                <Text style={styles.collectionEmoji}>🍷</Text>
              </View>
              <Text style={styles.collectionNumber}>{savedCounts.pairings}</Text>
              <Text style={styles.collectionLabel}>Pairings</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.collectionHint}>
            💡 Tap the bookmark icon on articles and recipes to save them here
          </Text>
        </View>

        {/* Share Profile / Vanity URL */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Share Your Profile</Text>
          </View>
          
          <View style={styles.vanityUrlCard}>
            {isEditingVanityUrl ? (
              <View style={styles.vanityUrlEditContainer}>
                <View style={styles.vanityUrlInputRow}>
                  <Text style={styles.vanityUrlPrefix}>cheezus.co/@</Text>
                  <TextInput
                    style={styles.vanityUrlInput}
                    value={editedVanityUrl}
                    onChangeText={(text) => {
                      setEditedVanityUrl(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                      setVanityUrlError('');
                    }}
                    placeholder="yourname"
                    placeholderTextColor={Colors.subtleText}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={20}
                  />
                </View>
                {vanityUrlError ? (
                  <Text style={styles.vanityUrlError}>{vanityUrlError}</Text>
                ) : null}
                <View style={styles.vanityUrlActions}>
                  <TouchableOpacity
                    style={styles.vanityUrlCancelButton}
                    onPress={() => {
                      setIsEditingVanityUrl(false);
                      setVanityUrlError('');
                    }}
                  >
                    <Text style={styles.vanityUrlCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.vanityUrlSaveButton}
                    onPress={handleSaveVanityUrl}
                  >
                    <Text style={styles.vanityUrlSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.vanityUrlDisplay}>
                  <Share2 size={20} color={Colors.primary} />
                  <Text style={styles.vanityUrlText}>
                    {profile?.vanity_url 
                      ? `cheezus.co/@${profile.vanity_url}`
                      : 'Set your custom profile URL'}
                  </Text>
                </View>
                <View style={styles.vanityUrlButtonRow}>
                  {profile?.vanity_url && (
                    <TouchableOpacity
                      style={styles.vanityUrlShareButton}
                      onPress={handleShareProfile}
                    >
                      <Share2 size={16} color={Colors.background} />
                      <Text style={styles.vanityUrlShareText}>Share Profile</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.vanityUrlEditButton}
                    onPress={() => {
                      setEditedVanityUrl(profile?.vanity_url || '');
                      setIsEditingVanityUrl(true);
                    }}
                  >
                    <Pencil size={14} color={Colors.text} />
                    <Text style={styles.vanityUrlEditText}>
                      {profile?.vanity_url ? 'Edit' : 'Set URL'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
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
              <ChevronRight size={16} color="#FCD95B" />
            </TouchableOpacity>
          </View>
          
          {recentActivity.length > 0 ? (
            <View style={styles.activityList}>
              {recentActivity.map((activity, index) => {
                const cheese = activity.producer_cheese as any;
                const isGeneric = cheese?.producer_name?.toLowerCase() === 'generic';
                const cheeseTypeName = cheese?.cheese_type?.name;
                const cheeseName = isGeneric 
                  ? (cheeseTypeName || cheese?.product_name || 'a cheese')
                  : (cheese?.full_name || cheese?.product_name || 'a cheese');
                const date = new Date(activity.created_at);
                const timeAgo = formatTimeAgo(date);
                
                return (
                  <TouchableOpacity 
                    key={activity.id} 
                    style={styles.activityItem}
                    onPress={() => activity.cheese_id && router.push(`/producer-cheese/${activity.cheese_id}`)}
                  >
                    <View style={styles.activityIconCircle}>
                      <Text style={styles.activityEmoji}>🧀</Text>
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>
                        Tried {cheeseName}
                      </Text>
                      <Text style={styles.activityDate}>
                        {activity.rating ? `⭐ ${Number(activity.rating) % 1 === 0 ? Number(activity.rating) : Number(activity.rating).toFixed(1)}/5 • ` : ''}{timeAgo}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={Colors.subtleText} />
                  </TouchableOpacity>
                );
              })}
              {stats.badgesEarned > 0 && (
                <TouchableOpacity 
                  style={styles.activityItem}
                  onPress={() => router.push('/badges')}
                >
                  <View style={styles.activityIconCircle}>
                    <Text style={styles.activityEmoji}>🏆</Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Achievement unlocked!</Text>
                    <Text style={styles.activityDate}>
                      {stats.badgesEarned} {stats.badgesEarned === 1 ? 'badge' : 'badges'} earned
                    </Text>
                  </View>
                  <ChevronRight size={16} color={Colors.subtleText} />
                </TouchableOpacity>
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

            <TouchableOpacity 
              style={styles.settingsItem}
              onPress={() => router.push('/settings/preferences')}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: '#FFF5E5' }]}>
                  <Settings size={20} color="#F39C12" />
                </View>
                <Text style={styles.settingsText}>Preferences</Text>
              </View>
              <ChevronRight size={20} color={Colors.subtleText} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingsItem}
              onPress={() => router.push('/settings/privacy')}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: '#FFE5E5' }]}>
                  <Text style={styles.settingsEmoji}>🔒</Text>
                </View>
                <Text style={styles.settingsText}>Privacy & Security</Text>
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

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
  },
  topBarTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
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
    backgroundColor: '#FCD95B',
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
    width: '100%',
    gap: Layout.spacing.s,
    marginTop: Layout.spacing.m,
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
  editInputMulti: {
    minHeight: 80,
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
    backgroundColor: '#FCD95B',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    alignItems: 'center',
    ...Layout.shadow.small,
  },
  statNumber: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.bodyBold,
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: '#1F2937',
  },

  // Follow stats
  followRow: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.l,
    gap: Layout.spacing.m,
    marginBottom: Layout.spacing.l,
  },
  followCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    gap: Layout.spacing.s,
    ...Layout.shadow.small,
  },
  followNumber: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodyBold,
    color: Colors.text,
  },
  followLabel: {
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
    color: '#FCD95B',
  },

  // Badges Grid
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: Layout.spacing.m,
  },
  badgeCircleContainer: {
    alignItems: 'center',
  },
  badgeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCircleCompleted: {
  },
  badgeCircleInProgress: {
  },
  badgeImageLarge: {
    width: 120,
    height: 120,
  },
  badgeEmojiLarge: {
    fontSize: 36,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  badgeProgressText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
    marginTop: 4,
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

  // Vanity URL styles
  vanityUrlCard: {
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.m,
    ...Layout.shadow.small,
  },
  vanityUrlEditContainer: {
    gap: Layout.spacing.m,
  },
  vanityUrlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.medium,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
  },
  vanityUrlPrefix: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  vanityUrlInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    paddingVertical: 0,
  },
  vanityUrlError: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: '#EF4444',
  },
  vanityUrlActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Layout.spacing.s,
  },
  vanityUrlCancelButton: {
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.m,
  },
  vanityUrlCancelText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
  },
  vanityUrlSaveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
  },
  vanityUrlSaveText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  vanityUrlDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    marginBottom: Layout.spacing.m,
  },
  vanityUrlText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    flex: 1,
  },
  vanityUrlButtonRow: {
    flexDirection: 'row',
    gap: Layout.spacing.s,
  },
  vanityUrlEditButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    backgroundColor: Colors.backgroundSecondary,
  },
  vanityUrlEditText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  vanityUrlShareButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.medium,
    backgroundColor: Colors.primary,
  },
  vanityUrlShareText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
  },
});
