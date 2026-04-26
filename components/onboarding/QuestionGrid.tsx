import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { QuizOption } from '@/constants/QuizQuestions';

type Props = {
  options: QuizOption[]; // expected length 4
  onSelect: (option: QuizOption) => void;
};

/**
 * Full-width photo tiles in a vertical scroll, identical visual treatment
 * to QuestionPair so Q1 / Q2 / Q3 / Q8 all read the same. With 4 options
 * the list scrolls vertically.
 *
 * Each tile is a fixed aspect ratio so the layout doesn't shift as users
 * scroll, and all four tiles match in size regardless of how many fit on
 * screen at once.
 */
export default function QuestionGrid({ options, onSelect }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleTap = (option: QuizOption, idx: number) => {
    setSelectedIdx(idx);
    onSelect(option);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
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
              <Image
                source={typeof opt.imageUrl === 'string' ? { uri: opt.imageUrl } : opt.imageUrl}
                style={styles.image}
                resizeMode="cover"
              />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.spacing.m,
    paddingBottom: Layout.spacing.m,
    gap: Layout.spacing.m,
  },
  tile: {
    width: '100%',
    aspectRatio: 1.4, // matches QuestionPair tile feel — wider than tall
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
