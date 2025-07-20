import { Tabs, useRouter } from 'expo-router';
import { House, Search, Plus, PackageOpen, User } from 'lucide-react-native';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { useProtectedRoute } from '../../hooks/useProtectedRoute';
import Colors from '@/constants/Colors';

export default function TabLayout() {
  useProtectedRoute();

  const router = useRouter();
  const { user } = useAuth();

  const iconColor = '#000000';
  const activeIconColor = '#000000';

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: activeIconColor,
          tabBarInactiveTintColor: iconColor,
          tabBarShowLabel: false,
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            href: '/',
            tabBarIcon: ({ color, size }) => (
              <House size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            href: '/discover',
            tabBarIcon: ({ color, size }) => (
              <Search size={size} color={color} />
            ),
          }}
        />

        {/* Hidden "Add" tab — no href, no icon */}
        <Tabs.Screen
          name="add"
          options={{
            title: '',
            // ❌ no `href` here — `href` + `tabBarButton` = runtime error
            tabBarButton: () => null,
          }}
        />

        <Tabs.Screen
          name="cheese-box"
          options={{
            title: 'Cheese Box',
            href: user ? '/cheese-box' : '/auth/login',
            tabBarIcon: ({ color, size }) => (
              <PackageOpen size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            href: '/profile',
            tabBarIcon: ({ color, size }) => (
              <User size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Floating "+" button that routes to /add-cheese */}
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => router.push('/add-cheese')}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#2C3E50" />
      </TouchableOpacity>
    </View>
  );
}

/* ───────────────────────── platform-specific shadows ──────────────────────── */
const platformShadowStyles = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  android: {
    elevation: 5,
  },
  web: {
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
  },
}) || {};

/* ────────────────────────────── styles ────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F0F0F0',
    height: 80,
    paddingBottom: 0,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 40,
    left: '50%',
    marginLeft: -28, // half of width (56 / 2)
    width: 56,
    height: 56,
    backgroundColor: '#FCD95B',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    ...platformShadowStyles,
  },
});