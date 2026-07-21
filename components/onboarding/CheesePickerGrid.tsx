import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Check } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import type { SuggestedCheese } from '@/lib/onboarding-suggestions';

type Props = {
  cheeses: SuggestedCheese[];
  /** id currently being written, so that tile shows a spinner */
  busyId?: string | null;
  /** ids already actioned this session, shown as ticked */
  doneIds?: string[];
  onSelect: (cheese: SuggestedCheese) => void;
};

/**
 * Two-column grid of tappable cheese tiles.
 *
 * Shared by the "log your first cheese" and "add to wishlist" onboarding steps, which
 * differ only in what the tap writes. Visual treatment follows QuestionGrid so the whole
 * onboarding flow reads as one piece.
 *
 * Tiles are disabled while any write is in flight, because a fast double tap on a
 * two-column grid is easy and would otherwise insert twice.
 */
export default function CheesePickerGrid({ cheeses, busyId, doneIds, onSelect }: Props) {
  const done = new Set(doneIds ?? []);
  const anyBusy = !!busyId;

  return (
    <View style={styles.grid}>
      {cheeses.map((cheese) => {
        const isDone = done.has(cheese.id);
        const isBusy = busyId === cheese.id;

        return (
          <TouchableOpacity
            key={cheese.id}
            style={[styles.tile, isDone && styles.tileDone]}
            activeOpacity={0.85}
            disabled={anyBusy || isDone}
            onPress={() => onSelect(cheese)}
          >
            <View style={styles.imageWrap}>
              {cheese.imageUrl ? (
                <Image
                  source={{ uri: cheese.imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.image, styles.imageFallback]}>
                  <Text style={styles.imageFallbackText}>🧀</Text>
                </View>
              )}

              {isBusy ? (
                <View style={styles.overlay}>
                  <ActivityIndicator size="small" color="#FFF" />
                </View>
              ) : null}

              {isDone ? (
                <View style={[styles.overlay, styles.overlayDone]}>
                  <Check size={26} color="#FFF" strokeWidth={3} />
                </View>
              ) : null}
            </View>

            <Text style={styles.name} numberOfLines={2}>
              {cheese.name}
            </Text>
            {cheese.originCountry ? (
              <Text style={styles.meta} numberOfLines={1}>
                {cheese.originCountry}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: '48%',
    marginBottom: Layout.spacing.l,
  },
  tileDone: {
    opacity: 0.7,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Layout.borderRadius.large,
    overflow: 'hidden',
    backgroundColor: Colors.card,
    marginBottom: Layout.spacing.s,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  imageFallbackText: {
    fontSize: 40,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayDone: {
    backgroundColor: 'rgba(28,16,8,0.55)',
  },
  name: {
    fontFamily: Typography.fonts.bodySemiBold,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    lineHeight: 18,
  },
  meta: {
    fontFamily: Typography.fonts.body,
    fontSize: Typography.sizes.xs,
    color: Colors.subtleText,
    marginTop: 2,
  },
});
