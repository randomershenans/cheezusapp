import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Lock, Eye, Download, Trash2, Smartphone } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

// Optional import - biometric auth only if package is installed
let LocalAuthentication: any = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch (e) {
  console.log('expo-local-authentication not installed');
}

type PrivacySettings = {
  profile_visibility: 'public' | 'private' | 'friends';
  biometric_login_enabled: boolean;
  two_factor_enabled: boolean;
};

export default function PrivacyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [settings, setSettings] = useState<PrivacySettings>({
    profile_visibility: 'public',
    biometric_login_enabled: false,
    two_factor_enabled: false,
  });

  useEffect(() => {
    if (user) {
      fetchPrivacySettings();
      checkBiometricAvailability();
    }
  }, [user]);

  const checkBiometricAvailability = async () => {
    if (!LocalAuthentication) {
      setBiometricAvailable(false);
      return;
    }

    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      setBiometricAvailable(compatible && enrolled);
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Touch ID');
      } else {
        setBiometricType('Biometric');
      }
    } catch (error) {
      console.error('Error checking biometric:', error);
      setBiometricAvailable(false);
    }
  };

  const fetchPrivacySettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          profile_visibility: data.profile_visibility ?? 'public',
          biometric_login_enabled: data.biometric_login_enabled ?? false,
          two_factor_enabled: data.two_factor_enabled ?? false,
        });
      }
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };


  const updateSetting = async (key: keyof PrivacySettings, value: any) => {
    if (!user) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      const { error } = await supabase
        .from('user_privacy_settings')
        .upsert({
          user_id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating setting:', error);
      setSettings(settings);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (!LocalAuthentication) {
      Alert.alert('Not Available', 'Biometric authentication is not available. Please install expo-local-authentication.');
      return;
    }

    if (value && biometricAvailable) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Enable ${biometricType}`,
        });
        
        if (result.success) {
          updateSetting('biometric_login_enabled', true);
        }
      } catch (error) {
        console.error('Biometric auth error:', error);
      }
    } else {
      updateSetting('biometric_login_enabled', false);
    }
  };

  const handleSetup2FA = () => {
    Alert.alert('Coming Soon', 'Two-factor authentication will be available soon');
  };

  const handleExportData = async () => {
    if (!user) return;

    Alert.alert(
      'Export Your Data',
      'We\'ll generate a JSON file with all your data that you can download.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export Now',
          onPress: async () => {
            try {
              // Fetch all user data
              const [profileRes, cheeseBoxRes, wishlistRes, followersRes, followingRes, badgesRes, ratingsRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('cheese_box_entries').select('*, producer_cheeses(full_name)').eq('user_id', user.id),
                supabase.from('wishlists').select('*, producer_cheeses(full_name)').eq('user_id', user.id),
                supabase.from('follows').select('profiles!follows_follower_id_fkey(name, username)').eq('following_id', user.id),
                supabase.from('follows').select('profiles!follows_following_id_fkey(name, username)').eq('follower_id', user.id),
                supabase.from('user_badges').select('*, badges(name, description)').eq('user_id', user.id),
                supabase.from('cheese_ratings').select('*, producer_cheeses(full_name)').eq('user_id', user.id),
              ]);

              const exportData = {
                exported_at: new Date().toISOString(),
                profile: profileRes.data,
                cheese_box: cheeseBoxRes.data || [],
                wishlist: wishlistRes.data || [],
                followers: followersRes.data || [],
                following: followingRes.data || [],
                badges: badgesRes.data || [],
                ratings: ratingsRes.data || [],
              };

              // Create downloadable JSON
              const jsonString = JSON.stringify(exportData, null, 2);
              const fileName = `cheezus-data-${new Date().toISOString().split('T')[0]}.json`;

              if (Platform.OS === 'web') {
                // Web: trigger download
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              } else {
                // Native: save to file and share
                const fileUri = FileSystem.documentDirectory + fileName;
                await FileSystem.writeAsStringAsync(fileUri, jsonString, {
                  encoding: FileSystem.EncodingType.UTF8,
                });
                
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/json',
                    dialogTitle: 'Export Your Cheezus Data',
                  });
                } else {
                  Alert.alert('Saved', `Data saved to: ${fileUri}`);
                }
              }

              Alert.alert('Success', 'Your data has been exported!');
            } catch (error) {
              console.error('Error exporting data:', error);
              Alert.alert('Error', 'Failed to export data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Coming Soon', 'Account deletion will be available soon');
          },
        },
      ]
    );
  };

  const visibilityOptions = [
    { value: 'public', label: 'Public', description: 'Anyone can see your profile' },
    { value: 'private', label: 'Private', description: 'Only you can see your profile' },
    { value: 'friends', label: 'Friends Only', description: 'Only people you follow can see' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Visibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Visibility</Text>
          <View style={styles.visibilityList}>
            {visibilityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.visibilityOption,
                  settings.profile_visibility === option.value && styles.visibilityOptionActive
                ]}
                onPress={() => updateSetting('profile_visibility', option.value)}
              >
                <View style={styles.visibilityLeft}>
                  <Text style={[
                    styles.visibilityLabel,
                    settings.profile_visibility === option.value && styles.visibilityLabelActive
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.visibilityDescription}>{option.description}</Text>
                </View>
                {settings.profile_visibility === option.value && (
                  <View style={styles.visibilityCheck}>
                    <Text style={styles.visibilityCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          {/* Biometric Login */}
          {biometricAvailable && (
            <View style={[styles.settingItem, { marginBottom: Layout.spacing.m }]}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Smartphone size={20} color="#2196F3" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>{biometricType}</Text>
                  <Text style={styles.settingDescription}>
                    Use {biometricType} to unlock the app
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.biometric_login_enabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: '#E0E0E0', true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}

          {/* 2FA - Coming Soon */}
          <View style={[styles.card, styles.cardDisabled]}>
            <Lock size={20} color={Colors.subtleText} />
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, styles.textDisabled]}>Two-Factor Authentication</Text>
              <Text style={styles.cardDescription}>
                Add an extra layer of security
              </Text>
            </View>
            <Text style={styles.comingSoonBadge}>Coming Soon</Text>
          </View>
        </View>

        {/* Data & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          
          <TouchableOpacity style={styles.card} onPress={handleExportData}>
            <Download size={20} color={Colors.subtleText} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Download Your Data</Text>
              <Text style={styles.cardDescription}>
                Export all your data (GDPR compliant)
              </Text>
            </View>
            <Text style={styles.cardAction}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: Colors.error }]}>Danger Zone</Text>
          
          <TouchableOpacity style={styles.dangerCard} onPress={handleDeleteAccount}>
            <Trash2 size={20} color={Colors.error} />
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: Colors.error }]}>Delete Account</Text>
              <Text style={styles.cardDescription}>
                Permanently delete your account and all data
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: Layout.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  visibilityList: {
    gap: Layout.spacing.s,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Layout.shadow.small,
  },
  visibilityOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFBF0',
  },
  visibilityLeft: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: 2,
  },
  visibilityLabelActive: {
    fontFamily: Typography.fonts.bodySemiBold,
  },
  visibilityDescription: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  visibilityCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Layout.spacing.m,
  },
  visibilityCheckText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    ...Layout.shadow.small,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Layout.spacing.m,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    lineHeight: 18,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Layout.spacing.m,
  },
  cardContent: {
    flex: 1,
    marginLeft: Layout.spacing.m,
  },
  cardTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  cardAction: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  textDisabled: {
    color: Colors.subtleText,
  },
  comingSoonBadge: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.subtleText,
    backgroundColor: Colors.border,
    paddingHorizontal: Layout.spacing.s,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.small,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    marginBottom: Layout.spacing.s,
    ...Layout.shadow.small,
  },
  sessionLeft: {
    flex: 1,
  },
  sessionDevice: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: 2,
  },
  sessionInfo: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  sessionLogout: {
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
  },
  sessionLogoutText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.error,
  },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    borderWidth: 1,
    borderColor: '#FFCCCC',
  },
});
