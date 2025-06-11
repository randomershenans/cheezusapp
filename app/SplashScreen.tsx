import React, { useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export default function SplashScreen() {
  const rotation = useSharedValue(0);
  
  useEffect(() => {
    rotation.value = withTiming(360, {
      duration: 1000,
      easing: Easing.linear,
    });
  }, []);

  const circleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` }
      ],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.cheese, circleStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFDB58',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cheese: {
    width: 120,
    height: 120,
    backgroundColor: '#FFB90F',
    borderRadius: 60,
    ...(Platform.OS === 'web' ? {
      clipPath: 'polygon(50% 50%, 100% 15%, 100% 85%, 50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%, 0 0, 50% 0)',
    } : {
      // For native platforms, approximate the shape with a simpler cutout
      borderTopRightRadius: 60,
      borderBottomRightRadius: 60,
      borderTopLeftRadius: 60,
      borderBottomLeftRadius: 60,
      marginRight: -30,
    }),
  },
});