import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { ArrowRight, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Analytics } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

const DISMISS_KEY = 'tune_feed_banner_dismissed_at';
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CHEESE_COUNT_THRESHOLD = 3;

/**
 * "Tune your feed in 60 seconds" banner. Rendered at the top of the home
 * feed for existing users who have not completed the onboarding quiz AND
 * have logged < 3 cheeses. Dismissable — stays hidden for 7 days after.
 */
export default function TuneYourFeedBanner() {
  const router = useRouter();
  const { user, loading, hasCompletedOnboarding } = useAuth();
  const [visible, setVisible] = useState(false);
  const [shownTracked, setShownTracked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      if (loading) return;
      if (!user) { if (!cancelled) setVisible(false); return; }
      if (hasCompletedOnboarding === true) { if (!cancelled) setVisible(false); return; }
      if (hasCompletedOnboarding === null)  return; // still loading profile

      // Check dismiss window.
      try {
        const lastRaw = await AsyncStorage.getItem(DISMISS_KEY);
        if (lastRaw) {
          const last = parseInt(lastRaw, 10);
          if (!Number.isNaN(last) && Date.now() - last < DISMISS_WINDOW_MS) {
            if (!cancelled) setVisible(false);
            return;
          }
        }
      } catch {
        // non-fatal — proceed to cheese-count check
      }

      // Check user's rated cheese count.
      try {
        const { count, error } = await supabase
          .from('cheese_box_entries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if (error) throw error;
        if (count !== null && count >= CHEESE_COUNT_THRESHOLD) {
          if (!cancelled) setVisible(false);
          return;
        }
      } catch {
        // If the count query fails, default to hiding the banner — safer than
        // spamming established users.
        if (!cancelled) setVisible(false);
        return;
      }

      if (!cancelled) setVisible(true);
    };

    void evaluate();
    return () => { cancelled = true; };
  }, [user, loading, hasCompletedOnboarding]);

  // Track the impression exactly once per mount when it first becomes visible.
  useEffect(() => {
    if (visible && !shownTracked) {
      Analytics.trackTuneFeedBannerShown(user?.id);
      setShownTracked(true);
    }
  }, [visible, shownTracked, user?.id]);

  if (!visible) return null;

  const onTap = () => {
    Analytics.trackTuneFeedBannerTapped(user?.id);
    router.push('/onboarding/quiz');
  };

  const onDismiss = async () => {
    Analytics.trackTuneFeedBannerDismissed(user?.id);
    setVisible(false);
    try {
      await AsyncStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // non-fatal
    }
  };

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.85} onPress={onTap}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🧀</Text>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Tune your feed in 60 seconds</Text>
          <Text style={styles.sub}>Take our quick taste quiz →</Text>
        </View>
        <ArrowRight size={18} color={Colors.text} />
      </View>
      <TouchableOpacity
        style={styles.dismiss}
        onPress={onDismiss}
        hitSlop={10}
        activeOpacity={0.7}
      >
        <X size={16} color={Colors.subtleText} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Layout.spacing.m,
    marginVertical: Layout.spacing.s,
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.m,
    paddingRight: Layout.spacing.xl,
    backgroundColor: '#FFF8E1',   // cream
    borderRadius: Layout.borderRadius.large,
    borderWidth: 1,
    borderColor: Colors.primary, // gold accent
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 26,
    marginRight: Layout.spacing.m,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.base,
    color: Colors.text,
  },
  sub: {
    fontFamily: Typography.fonts.body,
    fontSize: Typography.sizes.sm,
    color: Colors.subtleText,
    marginTop: 2,
  },
  dismiss: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
});
