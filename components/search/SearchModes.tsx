import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { SearchMode } from './types';

interface SearchModesProps {
  currentMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

export default function SearchModes({ currentMode, onModeChange }: SearchModesProps) {
  const getModeTitle = (mode: SearchMode): string => {
    switch (mode) {
      case 'all':
        return 'Everything';
      case 'cheese':
        return 'Cheeses';
      case 'pairing':
        return 'Pairings';
      default:
        return 'All';
    }
  };

  return (
    <View style={styles.container}>
      {(['all', 'cheese', 'pairing'] as SearchMode[]).map((mode) => (
        <TouchableOpacity
          key={mode}
          style={[
            styles.modeButton,
            currentMode === mode && styles.activeModeButton
          ]}
          onPress={() => onModeChange(mode)}
        >
          <Text 
            style={[
              styles.modeText,
              currentMode === mode && styles.activeModeText
            ]}
          >
            {getModeTitle(mode)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 4,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  modeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeModeButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  activeModeText: {
    color: Colors.background,
    fontWeight: 'bold',
  },
});
