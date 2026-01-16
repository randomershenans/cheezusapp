import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, SafeAreaView, Platform, Share, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Clock, Bookmark, Share2 } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Analytics } from '@/lib/analytics';
import CheeseTileGrid, { LinkedCheese } from '@/components/CheeseTileGrid';
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
  ingredients?: (string | { item: string; amount: string })[];
  instructions?: (string | { step: string; description?: string })[];
  serving_size?: string;
  preparation_time?: string;
  tags?: { tag: string }[];
};

export default function CheezeEntryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [entry, setEntry] = useState<CheezeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [linkedCheeses, setLinkedCheeses] = useState<LinkedCheese[]>([]);

  useEffect(() => {
    fetchEntry();
    fetchLinkedCheeses();
    if (id) {
      Analytics.trackArticleView(id as string, user?.id);
    }
  }, [id]);

  useEffect(() => {
    if (user && entry) {
      checkBookmarkStatus();
    }
  }, [user, entry]);

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

  const fetchLinkedCheeses = async () => {
    if (!id) return;
    
    try {
      console.log('Fetching linked cheeses for content:', id);
      const { data, error } = await supabase
        .rpc('get_content_cheeses', { p_content_id: id, p_limit: 6 });
      
      console.log('Linked cheeses response:', { data, error });
      
      if (error) {
        console.error('Error fetching linked cheeses:', error);
        return;
      }
      
      if (data && data.length > 0) {
        setLinkedCheeses(data);
      }
    } catch (error) {
      console.error('Exception fetching linked cheeses:', error);
    }
  };

  const checkBookmarkStatus = async () => {
    if (!user || !entry) return;
    
    try {
      const itemType = entry.content_type === 'recipe' ? 'recipe' : 'article';
      const { data, error } = await supabase
        .from('saved_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_type', itemType)
        .eq('item_id', entry.id)
        .maybeSingle();

      if (!error) {
        setSaved(!!data);
      }
    } catch (error) {
      console.error('Error checking bookmark:', error);
    }
  };

  const toggleBookmark = async () => {
    if (!user || !entry || savingBookmark) return;

    setSavingBookmark(true);
    try {
      const itemType = entry.content_type === 'recipe' ? 'recipe' : 'article';
      
      if (saved) {
        // Remove bookmark
        const { error } = await supabase
          .from('saved_items')
          .delete()
          .eq('user_id', user.id)
          .eq('item_type', itemType)
          .eq('item_id', entry.id);

        if (!error) {
          setSaved(false);
        }
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('saved_items')
          .insert({
            user_id: user.id,
            item_type: itemType,
            item_id: entry.id,
          });

        if (!error) {
          setSaved(true);
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleShare = async () => {
    if (!entry) return;

    try {
      const result = await Share.share({
        message: `Check out this ${entry.content_type}: ${entry.title}\n\n${entry.description}`,
        title: entry.title,
      });

      if (result.action === Share.sharedAction) {
        Analytics.trackArticleShare(entry.id, result.activityType, user?.id);
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
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
              onPress={toggleBookmark}
              disabled={!user || savingBookmark}
            >
              <Bookmark 
                size={24} 
                color={saved ? Colors.primary : "#FFFFFF"}
                fill={saved ? Colors.primary : "none"}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Share2 size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.metaContainer}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {entry.content_type.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
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
                  {entry.ingredients.map((ingredient, index) => {
                    const ingredientText = typeof ingredient === 'string' 
                      ? ingredient 
                      : `${ingredient.amount} ${ingredient.item}`;
                    
                    return (
                      <View key={index} style={styles.ingredientItem}>
                        <View style={styles.bullet} />
                        <Text style={styles.ingredientText}>{ingredientText}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
              
              {entry.instructions && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Instructions</Text>
                  {entry.instructions.map((instruction, index) => {
                    const instructionText = typeof instruction === 'string'
                      ? instruction
                      : instruction.step + (instruction.description ? `\n${instruction.description}` : '');
                    
                    return (
                      <View key={index} style={styles.instructionItem}>
                        <View style={styles.stepNumber}>
                          <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.instructionText}>{instructionText}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            <View>
              <Markdown style={markdownStyles}>{entry.content || ''}</Markdown>
            </View>
          )}

          {/* Linked Cheeses Section */}
          {linkedCheeses.length > 0 && (
            <CheeseTileGrid 
              cheeses={linkedCheeses} 
              title="Featured Cheeses" 
              maxDisplay={6} 
            />
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

const markdownStyles = {
  body: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.base,
  },
  heading1: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    marginTop: Layout.spacing.l,
    marginBottom: Layout.spacing.m,
    lineHeight: Typography.lineHeights.tight * Typography.sizes['2xl'],
  },
  heading2: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginTop: Layout.spacing.l,
    marginBottom: Layout.spacing.m,
    lineHeight: Typography.lineHeights.tight * Typography.sizes.xl,
  },
  heading3: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.headingMedium,
    color: Colors.text,
    marginTop: Layout.spacing.m,
    marginBottom: Layout.spacing.s,
    lineHeight: Typography.lineHeights.tight * Typography.sizes.lg,
  },
  heading4: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginTop: Layout.spacing.m,
    marginBottom: Layout.spacing.s,
  },
  heading5: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
    marginTop: Layout.spacing.s,
    marginBottom: Layout.spacing.xs,
  },
  heading6: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.subtleText,
    marginTop: Layout.spacing.s,
    marginBottom: Layout.spacing.xs,
  },
  paragraph: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
    lineHeight: Typography.lineHeights.relaxed * Typography.sizes.base,
  },
  strong: {
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
  em: {
    fontFamily: Typography.fonts.body,
    fontStyle: 'italic' as 'italic',
    color: Colors.text,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline' as 'underline',
  },
  blockquote: {
    backgroundColor: '#F5F5F5',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    marginVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.small,
  },
  code_inline: {
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    backgroundColor: '#F5F5F5',
    color: '#D73A49',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: Typography.sizes.sm,
  },
  code_block: {
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    backgroundColor: '#1A1A1A',
    color: '#F8F8F2',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    marginVertical: Layout.spacing.m,
    fontSize: Typography.sizes.sm,
  },
  fence: {
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    backgroundColor: '#1A1A1A',
    color: '#F8F8F2',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.medium,
    marginVertical: Layout.spacing.m,
    fontSize: Typography.sizes.sm,
  },
  bullet_list: {
    marginVertical: Layout.spacing.s,
  },
  ordered_list: {
    marginVertical: Layout.spacing.s,
  },
  list_item: {
    marginBottom: Layout.spacing.xs,
  },
  bullet_list_icon: {
    fontSize: Typography.sizes.base,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.base,
    marginRight: Layout.spacing.s,
    color: Colors.primary,
  },
  bullet_list_content: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.base,
  },
  ordered_list_icon: {
    fontSize: Typography.sizes.base,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.base,
    marginRight: Layout.spacing.s,
    color: Colors.text,
    fontFamily: Typography.fonts.bodyMedium,
  },
  ordered_list_content: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.base,
  },
  hr: {
    backgroundColor: '#E0E0E0',
    height: 1,
    marginVertical: Layout.spacing.l,
  },
  table: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: Layout.borderRadius.small,
    marginVertical: Layout.spacing.m,
  },
  thead: {
    backgroundColor: '#F5F5F5',
  },
  tbody: {},
  th: {
    padding: Layout.spacing.s,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    fontFamily: Typography.fonts.bodySemiBold,
  },
  tr: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  td: {
    padding: Layout.spacing.s,
  },
};