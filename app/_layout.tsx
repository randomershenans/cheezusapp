import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import * as Linking from 'expo-linking';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { AuthProvider } from '@/contexts/AuthContext'
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { supabase } from '@/lib/supabase';
import PushNotificationHandler from '@/components/PushNotificationHandler';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
  });

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Handle deep links
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      // Skip localhost URLs - these are normal web navigation, not deep links
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        return;
      }
      
      console.log('Deep link received:', url);
      
      // UUID regex pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      // Handle cheezus://profile/username or cheezus://profile?username=xxx
      const profileMatch = url.match(/profile\/([^/?]+)/);
      if (profileMatch) {
        const username = profileMatch[1];
        
        // If it's already a UUID, navigate directly
        if (uuidPattern.test(username)) {
          router.push(`/profile/${username}`);
          return;
        }
        
        // Look up user by vanity_url
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('vanity_url', username)
          .maybeSingle();
        
        if (profile) {
          router.push(`/profile/${profile.id}`);
        } else {
          // Try treating it as a user ID directly
          router.push(`/profile/${username}`);
        }
        return;
      }

      // Handle https://cheezus.co/@username
      const vanityMatch = url.match(/@([^/?]+)/);
      if (vanityMatch) {
        const username = vanityMatch[1];
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('vanity_url', username)
          .maybeSingle();
        
        if (profile) {
          router.push(`/profile/${profile.id}`);
        }
        return;
      }
    };

    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle URL when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, [router]);

  // Return null to keep splash screen visible while fonts load
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <PushNotificationHandler />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
        <Stack.Screen name="add-cheese" options={{ headerShown: false }} />
        <Stack.Screen name="cheese/new" options={{ headerShown: false }} />
        <Stack.Screen name="cheezopedia/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="pairing/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="badges" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}