import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, Camera } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';

type CheeseType = 'Hard' | 'Soft' | 'Semi-soft' | 'Fresh' | 'Blue' | 'Processed';
type MilkType = 'Cow' | 'Goat' | 'Sheep' | 'Mixed' | 'Buffalo';

const cheeseTypes: CheeseType[] = ['Hard', 'Soft', 'Semi-soft', 'Fresh', 'Blue', 'Processed'];
const milkTypes: MilkType[] = ['Cow', 'Goat', 'Sheep', 'Mixed', 'Buffalo'];

export default function NewCheeseScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams();
  
  const [cheeseName, setCheeseName] = useState(name as string || '');
  const [selectedType, setSelectedType] = useState<CheeseType | null>(null);
  const [selectedMilk, setSelectedMilk] = useState<MilkType | null>(null);
  const [origin, setOrigin] = useState({ country: '', region: '' });
  const [description, setDescription] = useState('');
  const [ageingPeriod, setAgeingPeriod] = useState('');
  const [flavorTags, setFlavorTags] = useState<string[]>([]);
  const [newFlavorTag, setNewFlavorTag] = useState('');

  const handleAddFlavorTag = () => {
    if (newFlavorTag.trim() && !flavorTags.includes(newFlavorTag.trim())) {
      setFlavorTags([...flavorTags, newFlavorTag.trim()]);
      setNewFlavorTag('');
    }
  };

  const handleRemoveFlavorTag = (tag: string) => {
    setFlavorTags(flavorTags.filter(t => t !== tag));
  };

  const handleSubmit = () => {
    // Here you would typically submit to your backend
    console.log({
      name: cheeseName,
      type: selectedType,
      milk: selectedMilk,
      origin,
      description,
      ageingPeriod,
      flavorTags
    });
    
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Cheese</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.imageUpload}>
          <Camera size={32} color={Colors.subtleText} />
          <Text style={styles.imageUploadText}>Add cheese photo</Text>
        </TouchableOpacity>

        <View style={styles.formSection}>
          <Text style={styles.label}>Cheese Name</Text>
          <TextInput
            style={styles.input}
            value={cheeseName}
            onChangeText={setCheeseName}
            placeholder="Enter cheese name"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.optionsGrid}>
            {cheeseTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.optionButton,
                  selectedType === type && styles.optionButtonSelected
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[
                  styles.optionText,
                  selectedType === type && styles.optionTextSelected
                ]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Milk Type</Text>
          <View style={styles.optionsGrid}>
            {milkTypes.map((milk) => (
              <TouchableOpacity
                key={milk}
                style={[
                  styles.optionButton,
                  selectedMilk === milk && styles.optionButtonSelected
                ]}
                onPress={() => setSelectedMilk(milk)}
              >
                <Text style={[
                  styles.optionText,
                  selectedMilk === milk && styles.optionTextSelected
                ]}>{milk}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Origin</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <TextInput
                style={styles.input}
                value={origin.country}
                onChangeText={(text) => setOrigin({ ...origin, country: text })}
                placeholder="Country"
              />
            </View>
            <View style={styles.spacer} />
            <View style={styles.flex1}>
              <TextInput
                style={styles.input}
                value={origin.region}
                onChangeText={(text) => setOrigin({ ...origin, region: text })}
                placeholder="Region (optional)"
              />
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the cheese's characteristics"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Ageing Period (optional)</Text>
          <TextInput
            style={styles.input}
            value={ageingPeriod}
            onChangeText={setAgeingPeriod}
            placeholder="e.g., 12-24 months"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Flavor Tags</Text>
          <View style={styles.tagInput}>
            <TextInput
              style={styles.tagInputField}
              value={newFlavorTag}
              onChangeText={setNewFlavorTag}
              placeholder="Add flavor characteristics"
              onSubmitEditing={handleAddFlavorTag}
            />
            <TouchableOpacity
              style={styles.addTagButton}
              onPress={handleAddFlavorTag}
            >
              <Text style={styles.addTagButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagsContainer}>
            {flavorTags.map((tag, index) => (
              <TouchableOpacity
                key={index}
                style={styles.tag}
                onPress={() => handleRemoveFlavorTag(tag)}
              >
                <Text style={styles.tagText}>{tag}</Text>
                <X size={14} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Add Cheese</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.text,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: Layout.spacing.m,
  },
  imageUpload: {
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.l,
  },
  imageUploadText: {
    marginTop: Layout.spacing.s,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.subtleText,
  },
  formSection: {
    marginBottom: Layout.spacing.l,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: Colors.text,
    marginBottom: Layout.spacing.s,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.medium,
    padding: Layout.spacing.m,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: Colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  optionButton: {
    paddingVertical: Layout.spacing.s,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    backgroundColor: '#F5F5F5',
  },
  optionButtonSelected: {
    backgroundColor: Colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.text,
  },
  optionTextSelected: {
    color: Colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  spacer: {
    width: Layout.spacing.m,
  },
  tagInput: {
    flexDirection: 'row',
    gap: Layout.spacing.s,
    marginBottom: Layout.spacing.s,
  },
  tagInputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.medium,
    padding: Layout.spacing.m,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: Colors.text,
  },
  addTagButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.l,
    justifyContent: 'center',
    borderRadius: Layout.borderRadius.medium,
  },
  addTagButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.s,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0DB',
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.large,
    gap: Layout.spacing.xs,
  },
  tagText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: Colors.primary,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    marginTop: Layout.spacing.l,
    marginBottom: Layout.spacing.xl,
  },
  submitButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
  },
});