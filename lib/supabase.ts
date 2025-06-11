import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

const MOBILE_TIMEOUT = 20000; // 20 seconds for mobile

// In-memory fallback storage for when AsyncStorage fails
const memoryStorage = new Map<string, string>();

const customStorageAdapter = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key) || memoryStorage.get(key) || null;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return memoryStorage.get(key) || null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
      memoryStorage.set(key, value);
    } catch (error) {
      console.error('Error writing to storage:', error);
      memoryStorage.set(key, value);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
      memoryStorage.delete(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
      memoryStorage.delete(key);
    }
  }
};

const supabaseUrl = 'https://xkvjqhgnwqawpojjegtr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrdmpxaGdud3Fhd3BvamplZ3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MzU3OTMsImV4cCI6MjA2MjAxMTc5M30.mHOLCmKkuED3X5PkXyvD-_6PM6jGNL0-3q7aychAK1s';

const createCustomFetch = () => {
  return (...args: Parameters<typeof fetch>) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, MOBILE_TIMEOUT);

    return fetch(...args, {
      signal: controller.signal
    }).finally(() => {
      clearTimeout(timeoutId);
    });
  };
};

const createAuthConfig = () => {
  const config = {
    storage: customStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce' as const,
  };

  if (Platform.OS === 'web') {
    return {
      ...config,
      async url() {
        try {
          return makeRedirectUri({
            path: '/auth/callback',
          });
        } catch (error) {
          console.error('Error creating redirect URI:', error);
          return '';
        }
      }
    };
  }

  return config;
};

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    global: {
      fetch: createCustomFetch()
    },
    auth: createAuthConfig()
  }
);