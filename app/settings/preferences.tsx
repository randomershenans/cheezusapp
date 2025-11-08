import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Globe, MapPin, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type UserPreferences = {
  notifications_enabled: boolean;
  language: string;
  location_enabled: boolean;
  personalized_recommendations: boolean;
};

export default function PreferencesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications_enabled: true,
    language: 'en',
    location_enabled: false,
    personalized_recommendations: true,
  });

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setPreferences({
          notifications_enabled: data.notifications_enabled ?? true,
          language: data.language ?? 'en',
          location_enabled: data.location_enabled ?? false,
          personalized_recommendations: data.personalized_recommendations ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof UserPreferences, value: any) => {
    if (!user) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...newPreferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating preference:', error);
      // Revert on error
      setPreferences(preferences);
      Alert.alert('Error', 'Failed to update preference');
    }
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧', available: true },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', available: false },
    { code: 'fr', name: 'French', flag: '🇫🇷', available: false },
    { code: 'it', name: 'Italian', flag: '🇮🇹', available: false },
    { code: 'de', name: 'German', flag: '🇩🇪', available: false },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#FFE5F5' }]}>
                <Bell size={20} color="#E91E63" />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Get notified about new pairings, badges, and updates
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.notifications_enabled}
              onValueChange={(value) => updatePreference('notifications_enabled', value)}
              trackColor={{ false: '#E0E0E0', true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language</Text>
          <View style={styles.languageList}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageItem,
                  preferences.language === lang.code && styles.languageItemActive,
                  !lang.available && styles.languageItemDisabled
                ]}
                onPress={() => lang.available && updatePreference('language', lang.code)}
                disabled={!lang.available}
              >
                <Text style={[styles.languageFlag, !lang.available && styles.languageFlagDisabled]}>
                  {lang.flag}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.languageName,
                    preferences.language === lang.code && styles.languageNameActive,
                    !lang.available && styles.languageNameDisabled
                  ]}>
                    {lang.name}
                  </Text>
                  {!lang.available && (
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  )}
                </View>
                {preferences.language === lang.code && lang.available && (
                  <View style={styles.languageCheck}>
                    <Text style={styles.languageCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#E5F9FF' }]}>
                <MapPin size={20} color="#2196F3" />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Enable Location Services</Text>
                <Text style={styles.settingDescription}>
                  Find local cheese shops and events near you
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.location_enabled}
              onValueChange={(value) => updatePreference('location_enabled', value)}
              trackColor={{ false: '#E0E0E0', true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Personalization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personalization</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#FFF5E5' }]}>
                <Sparkles size={20} color="#FF9800" />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Personalized Recommendations</Text>
                <Text style={styles.settingDescription}>
                  Get cheese and pairing suggestions based on your taste
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.personalized_recommendations}
              onValueChange={(value) => updatePreference('personalized_recommendations', value)}
              trackColor={{ false: '#E0E0E0', true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
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
  languageList: {
    gap: Layout.spacing.s,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Layout.shadow.small,
  },
  languageItemActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFBF0',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: Layout.spacing.m,
  },
  languageName: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  languageNameActive: {
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  languageItemDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  languageFlagDisabled: {
    opacity: 0.5,
  },
  languageNameDisabled: {
    color: Colors.subtleText,
  },
  comingSoonText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 2,
  },
  languageCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageCheckText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
  },
});
