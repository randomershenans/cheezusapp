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
 * Flavor chips — compact pill-shaped multi-select. Fed from CURATED_FLAVOR_TAGS.
 * Parent renders a Continue button (no autoadvance).
 */
export default function QuestionChips({ options, selected, maxSelections, onToggle }: Props) {
  const isSelected = (opt: QuizOption) => selected.some((s) => s.value === opt.value);
  const atMax = selected.length >= maxSelections;

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {options.map((opt, idx) => {
          const on = isSelected(opt);
          const disabled = !on && atMax;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.85}
              disabled={disabled}
              onPress={() => onToggle(opt)}
              style={[
                styles.chip,
                on && styles.chipSelected,
                disabled && styles.chipDisabled,
              ]}
            >
              <Text style={styles.emoji}>{opt.emoji ?? '🧀'}</Text>
              <Text style={[styles.chipLabel, on && styles.chipLabelSelected]}>{opt.label}</Text>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s + 2,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  emoji: {
    fontSize: 18,
    marginRight: 6,
  },
  chipLabel: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  chipLabelSelected: {
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
