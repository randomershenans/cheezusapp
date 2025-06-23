import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Layout from '@/constants/Layout';

interface BadgeProgressProps {
  icon: string;
  name: string;
  description: string;
  progress: number;
  threshold: number;
  completed: boolean;
  onPress?: () => void;
}

export default function BadgeProgressCard({
  icon,
  name,
  description,
  progress,
  threshold,
  completed,
  onPress,
}: BadgeProgressProps) {
  const percentComplete = Math.min(100, (progress / threshold) * 100);
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        completed && styles.completedContainer,
      ]}
      onPress={onPress}
    >
      {/* Badge icon with circle backdrop */}
      <View style={[styles.iconContainer, completed && styles.completedIconContainer]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      
      {/* Badge info */}
      <View style={styles.infoContainer}>
        <Text style={[styles.name, completed && styles.completedText]}>
          {name}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
        
        {/* Progress bar and count */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar, 
                { 
                  width: `${percentComplete}%`,
                  backgroundColor: completed ? '#FFD700' : '#3B82F6' 
                }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress}/{threshold} {completed && '✓'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius.large,
    padding: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
    ...Layout.shadow.medium,
    width: '92%', // Consistent with our updated tile widths
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  completedContainer: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFD700',
    borderWidth: 1,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E1F5FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  completedIconContainer: {
    backgroundColor: '#FFF8E1',
  },
  icon: {
    fontSize: 28,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontFamily: Typography.fonts.heading,
    fontSize: Typography.sizes.lg,
    marginBottom: Layout.spacing.xs,
    color: Colors.text,
  },
  completedText: {
    color: '#D4AF37', // Gold color for completed badges
  },
  description: {
    fontFamily: Typography.fonts.body,
    fontSize: Typography.sizes.sm,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.s,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: Layout.spacing.s,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: Typography.fonts.bodyMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.subtleText,
    width: 60, // Fixed width for alignment
    textAlign: 'right',
  },
});
