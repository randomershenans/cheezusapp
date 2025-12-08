import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';

/**
 * This route handles vanity URLs like /@username
 * It looks up the user by their vanity_url and redirects to their profile
 */
export default function VanityUrlRedirect() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (username) {
      lookupAndRedirect();
    }
  }, [username]);

  const lookupAndRedirect = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('vanity_url', username)
        .single();

      if (error || !data) {
        setError('Profile not found');
        return;
      }

      // Redirect to the actual profile page
      router.replace(`/profile/${data.id}`);
    } catch (err) {
      console.error('Error looking up vanity URL:', err);
      setError('Something went wrong');
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.subText}>The profile @{username} doesn't exist</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>Loading profile...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  errorText: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  subText: {
    marginTop: 8,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
});
