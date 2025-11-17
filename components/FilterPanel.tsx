import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

export type FilterOptions = {
  countries: string[];
  milkTypes: string[];
  cheeseTypes: string[];
  pairings: string[];
};

export type SelectedFilters = {
  country?: string;
  milkType?: string;
  cheeseType?: string;
  pairing?: string;
};

type FilterPanelProps = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: SelectedFilters) => void;
  options: FilterOptions;
  currentFilters: SelectedFilters;
};

export default function FilterPanel({ 
  visible, 
  onClose, 
  onApply, 
  options,
  currentFilters 
}: FilterPanelProps) {
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>(currentFilters);

  const handleFilterChange = (key: keyof SelectedFilters, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value
    }));
  };

  const handleApply = () => {
    onApply(selectedFilters);
    onClose();
  };

  const handleClear = () => {
    setSelectedFilters({});
    onApply({});
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filters</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Country Filter */}
        {options.countries.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Country</Text>
            <View style={styles.filterChips}>
              {options.countries.map(country => (
                <TouchableOpacity
                  key={country}
                  style={[
                    styles.filterChip,
                    selectedFilters.country === country && styles.filterChipActive
                  ]}
                  onPress={() => handleFilterChange('country', country)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedFilters.country === country && styles.filterChipTextActive
                  ]}>
                    {country}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Milk Type Filter */}
        {options.milkTypes.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Milk Type</Text>
            <View style={styles.filterChips}>
              {options.milkTypes.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    selectedFilters.milkType === type && styles.filterChipActive
                  ]}
                  onPress={() => handleFilterChange('milkType', type)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedFilters.milkType === type && styles.filterChipTextActive
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Cheese Type Filter */}
        {options.cheeseTypes.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Cheese Type</Text>
            <View style={styles.filterChips}>
              {options.cheeseTypes.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    selectedFilters.cheeseType === type && styles.filterChipActive
                  ]}
                  onPress={() => handleFilterChange('cheeseType', type)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedFilters.cheeseType === type && styles.filterChipTextActive
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Pairing Filter */}
        {options.pairings.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Pairings</Text>
            <View style={styles.filterChips}>
              {options.pairings.map(pairing => (
                <TouchableOpacity
                  key={pairing}
                  style={[
                    styles.filterChip,
                    selectedFilters.pairing === pairing && styles.filterChipActive
                  ]}
                  onPress={() => handleFilterChange('pairing', pairing)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedFilters.pairing === pairing && styles.filterChipTextActive
                  ]}>
                    {pairing}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Layout.borderRadius.large,
    borderTopRightRadius: Layout.borderRadius.large,
    maxHeight: '80%',
    ...Layout.shadow.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.l,
    paddingBottom: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
  },
  content: {
    padding: Layout.spacing.l,
    paddingTop: Layout.spacing.m,
  },
  filterSection: {
    marginBottom: Layout.spacing.l,
  },
  filterLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  filterChip: {
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.large,
    backgroundColor: Colors.card,
    ...Layout.shadow.small,
  },
  filterChipActive: {
    backgroundColor: '#FCD95B',
  },
  filterChipText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  filterChipTextActive: {
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
  },
  footer: {
    flexDirection: 'row',
    padding: Layout.spacing.l,
    gap: Layout.spacing.m,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  clearButton: {
    flex: 1,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  applyButton: {
    flex: 1,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    backgroundColor: '#FCD95B',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.background,
  },
});
