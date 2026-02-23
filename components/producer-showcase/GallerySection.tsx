import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { GalleryImage } from '@/lib/producer-sections-service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GALLERY_IMAGE_WIDTH = SCREEN_WIDTH * 0.7;
const GALLERY_IMAGE_HEIGHT = GALLERY_IMAGE_WIDTH * 0.75;

interface GallerySectionProps {
  title?: string;
  subtitle?: string;
  images: GalleryImage[];
}

export default function GallerySection({ title, subtitle, images }: GallerySectionProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {subtitle && <Text style={styles.superTitle}>{subtitle}</Text>}
        <Text style={styles.title}>{title || 'Gallery'}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={GALLERY_IMAGE_WIDTH + Layout.spacing.m}
      >
        {images.map((image, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.9}
            onPress={() => setSelectedImage(image)}
          >
            <View style={styles.imageCard}>
              <Image source={{ uri: image.url }} style={styles.galleryImage} />
              {image.caption && (
                <View style={styles.captionContainer}>
                  <Text style={styles.caption}>{image.caption}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Fullscreen modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedImage(null)}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <>
              <Image
                source={{ uri: selectedImage.url }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              {selectedImage.caption && (
                <Text style={styles.modalCaption}>{selectedImage.caption}</Text>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Layout.spacing.xl,
    backgroundColor: '#1a1a1a',
  },
  header: {
    paddingHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.l,
  },
  superTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: Layout.spacing.s,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: Layout.spacing.l,
    gap: Layout.spacing.m,
  },
  imageCard: {
    width: GALLERY_IMAGE_WIDTH,
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
  },
  galleryImage: {
    width: GALLERY_IMAGE_WIDTH,
    height: GALLERY_IMAGE_HEIGHT,
    backgroundColor: Colors.lightGray,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: Layout.spacing.m,
  },
  caption: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: 'rgba(255,255,255,0.9)',
  },

  // Fullscreen modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: Layout.spacing.m,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalImage: {
    width: SCREEN_WIDTH - Layout.spacing.l * 2,
    height: SCREEN_HEIGHT * 0.6,
  },
  modalCaption: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.l,
    textAlign: 'center',
  },
});
