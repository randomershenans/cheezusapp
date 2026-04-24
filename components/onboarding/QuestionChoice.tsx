import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { QuizOption } from '@/constants/QuizQuestions';

type Props = {
  options: QuizOption[];
  onSelect: (option: QuizOption) => void;
};

/**
 * Vertical list of 3 choice cards — used for the adventurousness question.
 * Tap autoadvances via parent.
 */
export default function QuestionChoice({ options, onSelect }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleTap = (opt: QuizOption, idx: number) => {
    setSelectedIdx(idx);
    onSelect(opt);
  };

  return (
    <View style={styles.container}>
      {options.map((opt, idx) => {
        const on = selectedIdx === idx;
        return (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.85}
            style={[styles.card, on && styles.cardSelected]}
            onPress={() => handleTap(opt, idx)}
          >
            <Text style={styles.emoji}>{opt.emoji ?? '🧀'}</Text>
            <View style={styles.textWrap}>
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
    paddingHorizontal: Layout.spacing.m,
    gap: Layout.spacing.m,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.l,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.large,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  emoji: {
    fontSize: 36,
    marginRight: Layout.spacing.m,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontFamily: Typography.fonts.heading,
    fontSize: Typography.sizes.xl,
    color: Colors.text,
  },
  sublabel: {
    marginTop: 2,
    fontFamily: Typography.fonts.body,
    fontSize: Typography.sizes.sm,
    color: Colors.subtleText,
  },
});
