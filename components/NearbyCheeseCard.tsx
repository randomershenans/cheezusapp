import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform } from 'react-native';
import { MapPin, Check, Navigation } from 'lucide-react-native';
import { requestForegroundPermissionsAsync, getForegroundPermissionsAsync } from 'expo-location';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

export default function NearbyCheeseCard() {
  const [locationStatus, setLocationStatus] = useState<'initial' | 'requesting' | 'granted' | 'denied'>('initial');
  const [fadeAnim] = useState(new Animated.Value(1));
  
  const checkLocationPermission = async () => {
    const { status } = await getForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationStatus('granted');
    }
  };
  
  React.useEffect(() => {
    checkLocationPermission();
  }, []);

  const requestLocation = async () => {
    setLocationStatus('requesting');
    const { status } = await requestForegroundPermissionsAsync();
    if (status === 'granted') {
      // Fade out current content
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setLocationStatus('granted');
        // Fade in new content
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    } else {
      setLocationStatus('denied');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <MapPin size={18} color="#FCD95B" />
          </View>
          <Text style={styles.headerText}>Cheese near you</Text>
        </View>
        <Text style={styles.timeText}>16h</Text>
      </View>
      
      <View style={styles.content}>
        <Animated.View style={[styles.mapPlaceholder, { opacity: fadeAnim }]}>
          {locationStatus === 'granted' ? (
            <>
              <View style={styles.successIcon}>
                <Check size={28} color={Colors.success} />
              </View>
              <Text style={styles.successText}>Location enabled!</Text>
              <Text style={styles.successSubtext}>
                Discovering cheese shops, events and tastings near you
              </Text>
              <View style={styles.nearbyItems}>
                <View style={styles.nearbyItem}>
                  <View style={styles.nearbyDot} />
                  <Text style={styles.nearbyText}>Artisan Cheese Co. • 0.3 mi</Text>
                </View>
                <View style={styles.nearbyItem}>
                  <View style={styles.nearbyDot} />
                  <Text style={styles.nearbyText}>Wine & Cheese Tasting • Tonight</Text>
                </View>
              </View>
            </>
          ) : locationStatus === 'denied' ? (
            <>
              <View style={styles.deniedIcon}>
                <MapPin size={28} color={Colors.subtleText} />
              </View>
              <Text style={styles.deniedText}>Location access denied</Text>
              <Text style={styles.deniedSubtext}>
                Enable location in settings to discover cheese experiences near you
              </Text>
            </>
          ) : (
            <>
              <View style={styles.locationIcon}>
                {locationStatus === 'requesting' ? (
                  <Navigation size={28} color="#FCD95B" />
                ) : (
                  <MapPin size={28} color="#FCD95B" />
                )}
              </View>
              <Text style={styles.enableText}>Discover cheese near you</Text>
              <Text style={styles.enableSubtext}>
                Find local cheese shops, tastings, and events in your area
              </Text>
              <TouchableOpacity 
                style={styles.permissionButton}
                onPress={requestLocation}
                disabled={locationStatus === 'requesting'}
              >
                <Text style={styles.permissionButtonText}>
                  {locationStatus === 'requesting' ? 'Getting location...' : 'Enable location'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    marginHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
    overflow: 'hidden',
    ...Layout.shadow.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.m,
    paddingBottom: Layout.spacing.s,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  timeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  content: {
    padding: Layout.spacing.m,
    paddingTop: 0,
  },
  mapPlaceholder: {
    minHeight: 180,
    backgroundColor: '#F8FFFE',
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.l,
    borderWidth: 1,
    borderColor: '#E8F8F5',
  },
  locationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF0DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  enableText: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.s,
    textAlign: 'center',
  },
  enableSubtext: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    marginBottom: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.s,
  },
  permissionButton: {
    backgroundColor: '#FCD95B',
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.xl,
    borderRadius: Layout.borderRadius.large,
    ...Layout.shadow.small,
  },
  permissionButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  successText: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.success,
    marginBottom: Layout.spacing.s,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    marginBottom: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.s,
  },
  nearbyItems: {
    width: '100%',
    gap: Layout.spacing.s,
  },
  nearbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    gap: Layout.spacing.s,
  },
  nearbyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FCD95B',
  },
  nearbyText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  deniedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  deniedText: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.s,
    textAlign: 'center',
  },
  deniedSubtext: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    paddingHorizontal: Layout.spacing.s,
  },
});