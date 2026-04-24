import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { QuizOption } from '@/constants/QuizQuestions';

type Props = {
  options: QuizOption[]; // expected length 2
  onSelect: (option: QuizOption) => void;
};

/**
 * Tinder-style 2-photo pick. Full-width stacked tiles, large hero photos,
 * tap triggers onSelect (which will autoadvance after a short delay in the
 * parent quiz screen).
 */
export default function QuestionPair({ options, onSelect }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleTap = (option: QuizOption, idx: number) => {
    setSelectedIdx(idx);
    onSelect(option);
  };

  return (
    <View style={styles.container}>
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
              {opt.sublabel ? <Text style={styles.sublabel}>{opt.sublabel}</Text> : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.m,
  },
  tile: {
    flex: 1,
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundSecondary,
    ...Layout.shadow.medium,
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
    fontSize: 80,
  },
  labelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.l,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Typography.fonts.heading,
    fontSize: Typography.sizes['2xl'],
  },
  sublabel: {
    color: '#F5F5F5',
    fontFamily: Typography.fonts.body,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
});
