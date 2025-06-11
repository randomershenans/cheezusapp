import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform } from 'react-native';
import { MapPin, Check } from 'lucide-react-native';
import { requestForegroundPermissionsAsync, getForegroundPermissionsAsync } from 'expo-location';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';

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
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setLocationStatus('granted');
        // Fade in new content
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
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
        <MapPin size={20} color="#888" />
        <Text style={styles.headerText}>Cheeze near you</Text>
        <Text style={styles.timeText}>16 hr</Text>
      </View>
      
      <View style={styles.content}>
        <Animated.View style={[styles.mapPlaceholder, { opacity: fadeAnim }]}>
          {locationStatus === 'granted' ? (
            <>
              <View style={styles.successIcon}>
                <Check size={32} color={Colors.success} />
              </View>
              <Text style={styles.successText}>Location enabled!</Text>
              <Text style={styles.successSubtext}>
                You'll now see cheese events and locations near you
              </Text>
            </>
          ) : (
            <>
              {locationStatus === 'requesting' ? (
                <View style={styles.loadingIcon}>
                  <MapPin size={32} color={Colors.primary} />
                </View>
              ) : (
                <MapPin size={32} color={Colors.primary} />
              )}
              <TouchableOpacity 
                style={styles.permissionButton}
                onPress={requestLocation}
              >
                <Text style={styles.permissionButtonText}>
                  Enable location
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
        {locationStatus !== 'granted' && (
          <Text style={styles.description}>
            Discover cheeses, friends and events near you
            </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.medium,
    marginHorizontal: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
    overflow: 'hidden',
    ...Layout.shadow.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.m,
    paddingBottom: Layout.spacing.s,
    gap: Layout.spacing.s,
  },
  headerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.text,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: Colors.subtleText,
  },
  content: {
    padding: Layout.spacing.m,
    paddingTop: 0,
  },
  mapPlaceholder: {
    height: 160,
    backgroundColor: '#E8F4FF',
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  permissionButton: {
    backgroundColor: Colors.background,
    paddingVertical: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.l,
    borderRadius: Layout.borderRadius.medium,
    marginTop: Layout.spacing.m,
  },
  permissionButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.text,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: Colors.text,
    lineHeight: 20,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  successText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.success,
    marginBottom: Layout.spacing.s,
  },
  successSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: Colors.text,
    textAlign: 'center',
    paddingHorizontal: Layout.spacing.m,
  },
  loadingIcon: {
    opacity: 0.5,
  },
});