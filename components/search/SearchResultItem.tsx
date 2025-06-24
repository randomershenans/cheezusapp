import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { SearchResult } from './types';

interface SearchResultItemProps {
  result: SearchResult;
  onPress: (result: SearchResult) => void;
}

const getResultIcon = (type: string): string => {
  switch (type) {
    case 'cheese':
      return '🧀';
    case 'pairing':
      return type === 'food' ? '🍯' : '🍷';
    case 'article':
      return '📝';
    case 'recipe':
      return '📒';
    default:
      return '📄';
  }
};

export default function SearchResultItem({ result, onPress }: SearchResultItemProps) {
  return (
    <TouchableOpacity
      style={styles.resultItem}
      key={result.id}
      onPress={() => onPress(result)}
    >
      <Text style={styles.resultIcon}>
        {getResultIcon(result.type === 'pairing' && result.pairingType ? result.pairingType : result.type)}
      </Text>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>{result.title}</Text>
        {result.description ? (
          <Text style={styles.resultDescription} numberOfLines={2}>
            {result.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  resultDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  }
});
