import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Clock, Bookmark, Share2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type CheezeEntry = {
  id: string;
  title: string;
  content_type: string;
  description: string;
  content: string;
  image_url: string;
  reading_time_minutes?: number;
  difficulty_level?: string;
  ingredients?: string[];
  instructions?: string[];
  serving_size?: string;
  preparation_time?: string;
  tags?: { tag: string }[];
};

export default function CheezeEntryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [entry, setEntry] = useState<CheezeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchEntry();
  }, [id]);

  const fetchEntry = async () => {
    try {
      const { data, error } = await supabase
        .from('cheezopedia_entries')
        .select(`
          *,
          tags:cheezopedia_tags(tag)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setEntry(data);
    } catch (error) {
      console.error('Error fetching entry:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="dark" />
        <Text style={styles.errorText}>Article not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isRecipe = entry.content_type === 'recipe';
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: entry.image_url }} 
            style={styles.heroImage}
          />
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.background} />
          </TouchableOpacity>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setSaved(!saved)}
            >
              <Bookmark 
                size={24} 
                color="#FFFFFF"
                fill={saved ? "#FFFFFF" : "none"}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {/* Handle share */}}
            >
              <Share2 size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.metaContainer}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {entry.content_type.charAt(0).toUpperCase() + entry.content_type.slice(1)}
              </Text>
            </View>
            
            {(entry.reading_time_minutes || entry.preparation_time) && (
              <View style={styles.timeContainer}>
                <Clock size={14} color={Colors.subtleText} />
                <Text style={styles.timeText}>
                  {isRecipe ? entry.preparation_time : `${entry.reading_time_minutes} min read`}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{entry.title}</Text>
          <Text style={styles.description}>{entry.description}</Text>

          {entry.tags && entry.tags.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.tagsContainer}
            >
              {entry.tags.map(({ tag }, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.tag}
                  onPress={() => {/* Handle tag press */}}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {isRecipe ? (
            <View style={styles.recipeContent}>
              {entry.ingredients && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Ingredients</Text>
                  {entry.ingredients.map((ingredient, index) => (
                    <View key={index} style={styles.ingredientItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.ingredientText}>{ingredient}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {entry.instructions && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Instructions</Text>
                  {entry.instructions.map((step, index) => (
                    <View key={index} style={styles.instructionItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.instructionText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.content}>{entry.content}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    position: 'absolute',
    top: Layout.spacing.m,
    left: Layout.spacing.m,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.l,
  },
  errorText: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  backButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 400,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    ...Platform.select({
      web: {
        objectFit: 'cover',
      },
    }),
  },
  actionButtons: {
    position: 'absolute',
    top: Layout.spacing.m,
    right: Layout.spacing.m,
    flexDirection: 'row',
    gap: Layout.spacing.s,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: Layout.spacing.m,
    paddingBottom: Layout.spacing.xl,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  typeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.large,
  },
  typeBadgeText: {
    color: Colors.background,
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
  },
  timeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    marginBottom: Layout.spacing.s,
  },
  description: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.base,
    marginBottom: Layout.spacing.m,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: Layout.spacing.l,
  },
  tag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.large,
    marginRight: Layout.spacing.s,
  },
  tagText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
  },
  content: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.base,
  },
  recipeContent: {
    marginTop: Layout.spacing.l,
  },
  section: {
    marginBottom: Layout.spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: Layout.spacing.m,
  },
  ingredientText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: Layout.spacing.m,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
  },
  stepNumberText: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
  },
  instructionText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.base,
  },
});