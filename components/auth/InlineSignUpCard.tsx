import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Sparkles, ChevronRight } from 'lucide-react-native';
import { Analytics } from '@/lib/analytics';
import SignInPromptSheet from '@/components/auth/SignInPromptSheet';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type Props = {
  /** 0-indexed: how many cards have appeared in this scroll session.
   *  Drives copy variants so the user doesn't see the same line repeatedly. */
  variantIndex?: number;
};

const VARIANTS = [
  {
    headline: "Loving this?",
    body: "Sign up free to save these cheeses and build your own collection.",
    cta: "Join Cheezus",
  },
  {
    headline: "Stop scrolling — start tasting.",
    body: "Free account · Tune your feed in 60 seconds · Track every cheese.",
    cta: "Get started",
  },
  {
    headline: "Your cheese journey starts here.",
    body: "Rate, save, share — it's all free. Takes 30 seconds.",
    cta: "Sign me up",
  },
  {
    headline: "Be honest, you want this.",
    body: "Build your taste profile, follow friends, never lose a great cheese.",
    cta: "Yes, sign me up",
  },
];

export default function InlineSignUpCard({ variantIndex = 0 }: Props) {
  const [promptVisible, setPromptVisible] = useState(false);
  const variant = VARIANTS[variantIndex % VARIANTS.length];

  const handleTap = () => {
    Analytics.trackSignedOutCtaTapped(`feed_inline_${variantIndex}`);
    setPromptVisible(true);
  };

  return (
    <>
      <TouchableOpacity activeOpacity={0.92} onPress={handleTap} style={styles.card}>
        <View style={styles.iconWell}>
          <Sparkles size={28} color="#1F2937" />
        </View>
        <View style={styles.copyBlock}>
          <Text style={styles.headline}>{variant.headline}</Text>
          <Text style={styles.body}>{variant.body}</Text>
          <View style={styles.ctaRow}>
            <Text style={styles.ctaText}>{variant.cta}</Text>
            <ChevronRight size={18} color="#1F2937" />
          </View>
        </View>
      </TouchableOpacity>

      <SignInPromptSheet
        visible={promptVisible}
        onDismiss={() => setPromptVisible(false)}
        context="generic"
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCD95B',
    borderRadius: 20,
    padding: Layout.spacing.m,
    marginHorizontal: Layout.spacing.m,
    marginVertical: Layout.spacing.s,
    gap: Layout.spacing.m,
    borderWidth: 2,
    borderColor: '#EAB308',
    ...Layout.shadow.medium,
  },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFEF7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#EAB308',
  },
  copyBlock: {
    flex: 1,
  },
  headline: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
    color: '#1F2937',
  },
  body: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: '#374151',
    marginTop: 2,
    lineHeight: 18,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },
  ctaText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyBold,
    color: '#1F2937',
    textDecorationLine: 'underline',
  },
});
