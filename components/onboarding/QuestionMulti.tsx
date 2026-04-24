import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { QuizOption } from '@/constants/QuizQuestions';

type Props = {
  options: QuizOption[];
  selected: QuizOption[];
  maxSelections: number;
  onToggle: (option: QuizOption) => void;
};

/**
 * Multi-select grid with emoji + label. Used for milk types and countries.
 * Does NOT autoadvance — parent renders a Continue button.
 */
export default function QuestionMulti({ options, selected, maxSelections, onToggle }: Props) {
  const isSelected = (opt: QuizOption) => selected.some((s) => s.value === opt.value);
  const atMax = selected.length >= maxSelections;

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {options.map((opt, idx) => {
          const on = isSelected(opt);
          const disabled = !on && atMax;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.85}
              disabled={disabled}
              style={[
                styles.tile,
                on && styles.tileSelected,
                disabled && styles.tileDisabled,
              ]}
              onPress={() => onToggle(opt)}
            >
              <Text style={styles.emoji}>{opt.emoji ?? '🧀'}</Text>
              <Text style={[styles.label, on && styles.labelSelected]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.helperText}>
        {selected.length}/{maxSelections} selected
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Layout.spacing.m,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.m,
    justifyContent: 'center',
  },
  tile: {
    width: '46%',
    aspectRatio: 1.4,
    borderRadius: Layout.borderRadius.large,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.m,
  },
  tileSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  tileDisabled: {
    opacity: 0.4,
  },
  emoji: {
    fontSize: 44,
    marginBottom: Layout.spacing.xs,
  },
  label: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.base,
    color: Colors.text,
  },
  labelSelected: {
    color: Colors.text,
  },
  helperText: {
    textAlign: 'center',
    marginTop: Layout.spacing.l,
    fontFamily: Typography.fonts.body,
    fontSize: Typography.sizes.sm,
    color: Colors.subtleText,
  },
});
