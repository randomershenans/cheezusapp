import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Image, ScrollView, Platform, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { User, ChevronRight, Heart, BookOpen, ChefHat, Settings, LogOut, Award, Star, Crown, CreditCard as Edit2 } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

const badges: Badge[] = [
  {
    id: 'og',
    name: 'OG Cheese Lover',
    description: 'Member since day one',
    icon: <Crown size={24} color="#FFD700" />,
    color: '#FFF7E6'
  },
  {
    id: 'fiend',
    name: 'Cheese Fiend',
    description: 'Tried over 50 cheeses',
    icon: <Star size={24} color="#FF6B6B" />,
    color: '#FFE8EC'
  },
  {
    id: 'french',
    name: 'French Connoisseur',
    description: 'Expert in French cheeses',
    icon: <Award size={24} color="#4CAF50" />,
    color: '#E8F8F0'
  }
];

export default function ProfileScreen() {
  const router = useRouter();
  
  const navigateToSignup = () => {
    router.push('/auth/signup');
  };
  
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedTagline, setEditedTagline] = useState('');
  const [stats, setStats] = useState({
    cheesesTried: 42,
    reviews: 28,
    favorites: 15
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditedName(data?.name || '');
      setEditedTagline(data?.tagline || 'Cheese enthusiast');
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editedName,
          tagline: editedTagline,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setProfile(prev => ({
        ...prev,
        name: editedName,
        tagline: editedTagline
      }));
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };
  
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content}>
          <View style={styles.heroSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarPlaceholder}>
                <User size={40} color={Colors.subtleText} />
              </View>
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
            <TouchableOpacity 
              style={styles.signupButton}
              onPress={navigateToSignup}
            >
              <Text style={styles.signupButtonText}>Create Account</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.modernHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity>
            <Settings size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.profileHeaderCard}>
          <Image 
            source={{ uri: profile?.avatar_url || 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg' }} 
            style={styles.modernProfileImage}
          />
          {isEditing ? (
            <View style={styles.profileInfo}>
              <TextInput
                style={styles.nameInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Your name"
              />
              <TextInput
                style={styles.bioInput}
                value={editedTagline}
                onChangeText={setEditedTagline}
                placeholder="Your tagline"
                multiline
              />
              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <View style={styles.nameContainer}>
                <Text style={styles.profileName}>{profile?.name || 'Add your name'}</Text>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Edit2 size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.profileBio}>{profile?.tagline || 'Cheese enthusiast'}</Text>
            </View>
          )}
        </View>
      </View>
      
      <ScrollView 
        style={styles.profileContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.cheesesTried}</Text>
            <Text style={styles.statLabel}>Cheeses Tried</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.reviews}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.favorites}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>
        
        <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesContainer}
          >
            {badges.map((badge) => (
              <View 
                key={badge.id} 
                style={[styles.badgeCard, { backgroundColor: badge.color }]}
              >
                <View style={styles.badgeIcon}>
                  {badge.icon}
                </View>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeDescription}>{badge.description}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>My Cheese Journey</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <BookOpen size={20} color={Colors.primary} />
            </View>
            <Text style={styles.menuText}>Saved Articles</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <ChefHat size={20} color={Colors.primary} />
            </View>
            <Text style={styles.menuText}>My Recipes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Heart size={20} color={Colors.primary} />
            </View>
            <Text style={styles.menuText}>Favorites</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={signOut}
        >
          <LogOut size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'web' ? Layout.spacing.m : 0,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    padding: Layout.spacing.xl,
    alignItems: 'center',
  },
  avatarContainer: {
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
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: Colors.text,
    marginBottom: Layout.spacing.m,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    padding: Layout.spacing.xl,
    backgroundColor: '#F9F9F9',
  },
  featuresTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
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
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: Colors.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
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
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
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
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
  },
  profileContent: {
    flex: 1,
  },
  profileHeader: {
    padding: Layout.spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: Layout.spacing.m,
  },
  profileInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
  },
  editButton: {
    padding: 4,
  },
  nameInput: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.small,
    padding: Layout.spacing.s,
    marginBottom: Layout.spacing.s,
  },
  bioInput: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.small,
    padding: Layout.spacing.s,
    marginBottom: Layout.spacing.s,
  },
  editActions: {
    flexDirection: 'row',
    gap: Layout.spacing.s,
  },
  cancelButton: {
    flex: 1,
    padding: Layout.spacing.s,
    borderRadius: Layout.borderRadius.small,
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.subtleText,
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    padding: Layout.spacing.s,
    borderRadius: Layout.borderRadius.small,
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.background,
    textAlign: 'center',
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.text,
    marginBottom: 4,
  },
  profileBio: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: Colors.subtleText,
    lineHeight: 20,
  },
  menuSection: {
    padding: Layout.spacing.m,
    marginTop: Layout.spacing.m,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  menuText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: Colors.text,
  },
  modernHeader: {
    backgroundColor: Colors.background,
    paddingBottom: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.m,
  },
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Layout.spacing.m,
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.m,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  modernProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: Layout.spacing.m,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: Layout.spacing.m,
    marginTop: Layout.spacing.m,
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
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: Colors.subtleText,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  badgesSection: {
    marginTop: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.m,
  },
  badgesContainer: {
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.s,
    gap: Layout.spacing.m,
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
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.text,
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
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
    marginLeft: Layout.spacing.s,
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: Colors.error,
  }
});