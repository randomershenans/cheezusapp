import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { QuizOption } from '@/constants/QuizQuestions';

type Props = {
  options: QuizOption[]; // expected length 4
  onSelect: (option: QuizOption) => void;
};

/**
 * 2×2 grid of photo tiles. Tap to select; autoadvances from parent.
 */
export default function QuestionGrid({ options, onSelect }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleTap = (option: QuizOption, idx: number) => {
    setSelectedIdx(idx);
    onSelect(option);
  };

  return (
    <View style={styles.grid}>
      {options.map((opt, idx) => {
        const selected = selectedIdx === idx;
        return (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.85}
            style={[styles.tile, selected && styles.tileSelected]}
            onPress={() => handleTap(opt, idx)}
          >
            {opt.imageUrl ? (
              <Image source={{ uri: opt.imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.image, styles.imageFallback]}>
                <Text style={styles.emoji}>{opt.emoji ?? '🧀'}</Text>
              </View>
            )}
            <View style={styles.labelOverlay}>
              <Text style={styles.label}>{opt.label}</Text>
              {opt.sublabel ? <Text style={styles.sublabel} numberOfLines={1}>{opt.sublabel}</Text> : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.m,
  },
  tile: {
    width: '48%',
    aspectRatio: 0.9,
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundSecondary,
    ...Layout.shadow.small,
  },
  tileSelected: {
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 64,
  },
  labelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Typography.fonts.headingMedium,
    fontSize: Typography.sizes.base,
  },
  sublabel: {
    color: '#F5F5F5',
    fontFamily: Typography.fonts.body,
    fontSize: Typography.sizes.xs,
    marginTop: 1,
  },
});
