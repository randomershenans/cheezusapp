import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const code = params.code as string;

  useEffect(() => {
    const handleCallback = async () => {
      if (code) {
        try {
          // Exchange the code for a session
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Error exchanging code:', error);
            router.replace('/auth/login');
            return;
          }
          
          // The PASSWORD_RECOVERY event in AuthContext will handle navigation
          // But as a fallback, wait a moment then check
          setTimeout(() => {
            router.replace('/auth/reset-password');
          }, 500);
        } catch (err) {
          console.error('Callback error:', err);
          router.replace('/auth/login');
        }
      }
    };

    handleCallback();
  }, [code]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>Processing...</Text>
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
  text: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text,
  },
});
