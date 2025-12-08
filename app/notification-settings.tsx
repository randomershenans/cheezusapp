import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Users, Award, Sparkles, Clock, MessageCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type NotificationSettings = {
  push_enabled: boolean;
  push_follows: boolean;
  push_badges: boolean;
  push_social_activity: boolean;
  push_recommendations: boolean;
  push_reminders: boolean;
  in_app_follows: boolean;
  in_app_badges: boolean;
  in_app_social_activity: boolean;
  in_app_recommendations: boolean;
  in_app_reminders: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
};

const defaultSettings: NotificationSettings = {
  push_enabled: true,
  push_follows: true,
  push_badges: true,
  push_social_activity: true,
  push_recommendations: true,
  push_reminders: true,
  in_app_follows: true,
  in_app_badges: true,
  in_app_social_activity: true,
  in_app_recommendations: true,
  in_app_reminders: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No settings yet, create default
        await supabase
          .from('notification_settings')
          .insert({ user_id: user.id });
      } else if (data) {
        setSettings({
          ...defaultSettings,
          ...data,
        });
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    if (!user) return;
    
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await supabase
        .from('notification_settings')
        .update({ [key]: value })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating setting:', error);
      // Revert on error
      setSettings(settings);
    }
  };

  const SettingRow = ({ 
    icon: Icon, 
    iconColor,
    title, 
    description, 
    settingKey,
    disabled = false,
  }: { 
    icon: any;
    iconColor: string;
    title: string; 
    description: string; 
    settingKey: keyof NotificationSettings;
    disabled?: boolean;
  }) => (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={[styles.settingIcon, { backgroundColor: iconColor + '20' }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={settings[settingKey] as boolean}
        onValueChange={(value) => updateSetting(settingKey, value)}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={settings[settingKey] ? '#1F2937' : Colors.background}
        disabled={disabled}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notification Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Master Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <View style={styles.masterToggle}>
            <View style={styles.masterToggleContent}>
              <Bell size={24} color={settings.push_enabled ? Colors.primary : Colors.subtleText} />
              <View style={styles.masterToggleText}>
                <Text style={styles.masterToggleTitle}>Enable Push Notifications</Text>
                <Text style={styles.masterToggleDescription}>
                  Receive notifications even when the app is closed
                </Text>
              </View>
            </View>
            <Switch
              value={settings.push_enabled}
              onValueChange={(value) => updateSetting('push_enabled', value)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={settings.push_enabled ? '#1F2937' : Colors.background}
            />
          </View>
        </View>

        {/* Push Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notification Types</Text>
          <Text style={styles.sectionSubtitle}>Choose what to be notified about</Text>
          
          <View style={styles.settingsCard}>
            <SettingRow
              icon={Users}
              iconColor="#3B82F6"
              title="Follows"
              description="When someone follows you"
              settingKey="push_follows"
              disabled={!settings.push_enabled}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={Award}
              iconColor="#F59E0B"
              title="Badges"
              description="When you or friends earn badges"
              settingKey="push_badges"
              disabled={!settings.push_enabled}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={MessageCircle}
              iconColor="#10B981"
              title="Social Activity"
              description="When friends try cheeses or add to wishlist"
              settingKey="push_social_activity"
              disabled={!settings.push_enabled}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={Sparkles}
              iconColor="#8B5CF6"
              title="Recommendations"
              description="Trending cheeses and personalized suggestions"
              settingKey="push_recommendations"
              disabled={!settings.push_enabled}
            />
            <View style={styles.divider} />
            <SettingRow
              icon={Clock}
              iconColor="#EC4899"
              title="Reminders"
              description="Wishlist reminders and weekly updates"
              settingKey="push_reminders"
              disabled={!settings.push_enabled}
            />
          </View>
        </View>

        {/* In-App Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In-App Notifications</Text>
          <Text style={styles.sectionSubtitle}>What shows in your notification center</Text>
          
          <View style={styles.settingsCard}>
            <SettingRow
              icon={Users}
              iconColor="#3B82F6"
              title="Follows"
              description="New followers"
              settingKey="in_app_follows"
            />
            <View style={styles.divider} />
            <SettingRow
              icon={Award}
              iconColor="#F59E0B"
              title="Badges"
              description="Badge achievements"
              settingKey="in_app_badges"
            />
            <View style={styles.divider} />
            <SettingRow
              icon={MessageCircle}
              iconColor="#10B981"
              title="Social Activity"
              description="Friend activity"
              settingKey="in_app_social_activity"
            />
            <View style={styles.divider} />
            <SettingRow
              icon={Sparkles}
              iconColor="#8B5CF6"
              title="Recommendations"
              description="Cheese suggestions"
              settingKey="in_app_recommendations"
            />
            <View style={styles.divider} />
            <SettingRow
              icon={Clock}
              iconColor="#EC4899"
              title="Reminders"
              description="Wishlist and activity reminders"
              settingKey="in_app_reminders"
            />
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={[styles.settingIcon, { backgroundColor: '#6366F120' }]}>
                <Clock size={20} color="#6366F1" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Enable Quiet Hours</Text>
                <Text style={styles.settingDescription}>
                  No push notifications from 10pm - 8am
                </Text>
              </View>
              <Switch
                value={settings.quiet_hours_enabled}
                onValueChange={(value) => updateSetting('quiet_hours_enabled', value)}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={settings.quiet_hours_enabled ? '#1F2937' : Colors.background}
              />
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Push notifications require permission. You can manage this in your device settings.
          </Text>
        </View>
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
  title: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Layout.spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  section: {
    paddingHorizontal: Layout.spacing.m,
    paddingTop: Layout.spacing.l,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.m,
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    ...Layout.shadow.small,
  },
  masterToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  masterToggleText: {
    marginLeft: Layout.spacing.m,
    flex: 1,
  },
  masterToggleTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  masterToggleDescription: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    ...Layout.shadow.small,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.m,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  settingTitleDisabled: {
    color: Colors.subtleText,
  },
  settingDescription: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 72,
  },
  footer: {
    padding: Layout.spacing.l,
    paddingTop: Layout.spacing.xl,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
  },
});
