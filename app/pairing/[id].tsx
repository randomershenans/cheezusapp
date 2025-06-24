import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type PairingDetailsProps = {
  id: string;
};

type Pairing = {
  id: string;
  pairing: string;
  type: string;
  description?: string;
  image_url?: string;
  cheeses?: {
    id: string;
    name: string;
    origin_country?: string;
    origin_region?: string;
    image_url?: string;
  }[];
};

// We no longer have rating functionality, so removed the stars rendering

export default function PairingScreen() {
  const { id } = useLocalSearchParams<PairingDetailsProps>();
  const router = useRouter();
  
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPairingDetails();
    }
  }, [id]);

  const fetchPairingDetails = async () => {
    try {
      setLoading(true);
      
      // Check if id is valid
      if (!id) {
        console.error('Invalid pairing ID');
        setLoading(false);
        return;
      }
      
      console.log('Fetching pairing with ID:', id);
      
      // First try to get the pairing details directly by ID
      const { data: pairingData, error: pairingError } = await supabase
        .from('cheese_pairings')
        .select('*')
        .eq('id', id)
        .single();

      if (pairingError) {
        console.error('Error fetching pairing:', pairingError);
        throw pairingError;
      }
      
      if (!pairingData) {
        console.error('No pairing found with ID:', id);
        setLoading(false);
        return;
      }
      
      console.log('Found pairing:', pairingData);
      
      // Then fetch all cheeses that pair with this pairing
      const { data: cheesesData, error: cheesesError } = await supabase
        .from('cheese_pairings')
        .select(`
          cheeses!inner(
            id,
            name,
            origin_country,
            origin_region,
            image_url
          )
        `)
        .eq('pairing', pairingData.pairing)
        .eq('type', pairingData.type);
      
      if (cheesesError) {
        console.error('Error fetching paired cheeses:', cheesesError);
        throw cheesesError;
      }
      
      // Transform the data to the structure we need
      const cheese_list = cheesesData.map(item => item.cheeses);
      
      // Combine data
      const pairingWithCheeses = {
        ...pairingData,
        cheeses: cheese_list
      };
      
      setPairing(pairingWithCheeses);
      
    } catch (error) {
      console.error('Error fetching pairing details:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToCheese = (cheeseId: string) => {
    router.push(`/cheese/${cheeseId}`);
  };

  // Determine if this is a food or drink pairing and select appropriate header style
  const isPairingFood = pairing?.type === 'food';
  const headerEmoji = isPairingFood ? '🍯' : '🍷';
  const headerColor = isPairingFood ? '#FFC107' : '#9C27B0';
  
  // Default image for pairings that don't have one
  const defaultImage = isPairingFood 
    ? 'https://images.unsplash.com/photo-1624813686965-da3c240cf794?q=80&w=1000' 
    : 'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?q=80&w=1000';

  if (!pairing && loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" translucent />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading pairing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!pairing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" translucent />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Pairing not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hero Image */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: pairing.image_url || defaultImage }}
          style={styles.heroImage}
        />
        <View style={[styles.overlay, { backgroundColor: `${headerColor}99` }]} />
        
        {/* Hero Content */}
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.heroTextContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.pairingTypeLabel}>{headerEmoji} {isPairingFood ? 'Food' : 'Drink'} Pairing</Text>
            </View>
            <Text style={styles.pairingName}>{pairing.pairing}</Text>
          </View>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {pairing.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this pairing</Text>
              <Text style={styles.description}>{pairing.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cheeses that pair well</Text>
            {pairing.cheeses && pairing.cheeses.length > 0 ? (
              <View style={styles.cheeseGrid}>
                {pairing.cheeses.map((cheese, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.cheeseCard}
                    onPress={() => navigateToCheese(cheese.id)}
                  >
                    <Image 
                      source={{ 
                        uri: cheese.image_url || 'https://images.unsplash.com/photo-1566454825481-9c31a52e2f92?q=80&w=1000' 
                      }}
                      style={styles.cheeseImage}
                    />
                    <View style={styles.cheeseInfo}>
                      <Text style={styles.cheeseName}>{cheese.name}</Text>
                      {cheese.origin_country && (
                        <Text style={styles.cheeseCountry}>{cheese.origin_country}</Text>
                      )}
                      {cheese.origin_region && (
                        <Text style={styles.cheeseRegion}>{cheese.origin_region}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.noCheesesMessage}>No cheeses found for this pairing.</Text>
            )}
          </View>
          
          {/* Spacing at the bottom for better scrolling */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Layout.spacing.m,
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
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Layout.spacing.l,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: Layout.spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: Layout.spacing.m,
  },
  backButtonText: {
    color: Colors.background,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
  },
  heroTextContainer: {
    marginBottom: Layout.spacing.m,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
  },
  pairingTypeLabel: {
    color: Colors.background,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: Layout.spacing.s,
    overflow: 'hidden',
  },
  pairingName: {
    color: Colors.background,
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  contentContainer: {
    padding: Layout.spacing.l,
  },
  section: {
    marginBottom: Layout.spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
  },
  description: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    lineHeight: 22,
  },
  cheeseGrid: {
    flexDirection: 'column',
    gap: Layout.spacing.l,
  },
  cheeseCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cheeseImage: {
    width: 90,
    height: 90,
    objectFit: 'cover',
  },
  cheeseInfo: {
    flex: 1,
    padding: Layout.spacing.m,
    justifyContent: 'center',
  },
  cheeseName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  cheeseCountry: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.xs,
  },
  cheeseRegion: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    marginBottom: Layout.spacing.s,
  },
  noCheesesMessage: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    fontStyle: 'italic',
  },
});
