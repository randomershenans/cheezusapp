import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { Analytics } from '@/lib/analytics';
import OAuthButtons from '@/components/auth/OAuthButtons';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  /** What the user was trying to do — drives the copy. */
  context?:
    | 'add_cheese'
    | 'follow'
    | 'rate'
    | 'wishlist'
    | 'save_article'
    | 'share_profile'
    | 'generic';
  /** Called after OAuth succeeds — caller decides where to route. */
  onAuthenticated?: () => void;
};

const COPY: Record<NonNullable<Props['context']>, { title: string; body: string }> = {
  add_cheese:    { title: 'Log this cheese',           body: 'Create a free account to save your cheese journey and build your taste profile.' },
  follow:        { title: 'Follow cheese lovers',      body: 'Sign up to follow people, see their discoveries, and build your own circle.' },
  rate:          { title: 'Rate this cheese',          body: 'Join Cheezus to rate cheeses and get smarter recommendations tuned to your taste.' },
  wishlist:      { title: 'Save to your wishlist',     body: 'Create a free account to save cheeses for later and get notified when you\'re near them.' },
  save_article:  { title: 'Save articles',             body: 'Sign up to bookmark articles, recipes, and pairings for when you\'re ready to dig in.' },
  share_profile: { title: 'Share your cheese journey', body: 'Sign up to get a shareable profile showing off your cheese board.' },
  generic:       { title: 'Join Cheezus',              body: 'Create a free account to unlock the full experience.' },
};

export default function SignInPromptSheet({
  visible,
  onDismiss,
  context = 'generic',
  onAuthenticated,
}: Props) {
  const router = useRouter();
  const copy = COPY[context];

  React.useEffect(() => {
    if (visible) Analytics.trackSignInPromptShown(context);
  }, [visible, context]);

  const handleEmailSignup = () => {
    Analytics.trackSignInPromptAction(context, 'email_signup');
    onDismiss();
    router.push('/auth/signup');
  };

  const handleEmailLogin = () => {
    Analytics.trackSignInPromptAction(context, 'email_login');
    onDismiss();
    router.push('/auth/login');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheet}>
            <TouchableOpacity style={styles.close} onPress={onDismiss}>
              <X size={20} color={Colors.subtleText} />
            </TouchableOpacity>

            <View style={styles.handle} />

            <Text style={styles.logo}>🧀</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.body}>{copy.body}</Text>

            <OAuthButtons
              mode="signup"
              dividerLabel="sign up with"
              onSuccess={() => {
                onDismiss();
                Analytics.trackSignInPromptAction(context, 'oauth_success');
                onAuthenticated?.();
              }}
            />

            <TouchableOpacity style={styles.emailButton} onPress={handleEmailSignup} activeOpacity={0.85}>
              <Text style={styles.emailButtonText}>Sign up with email</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginRow} onPress={handleEmailLogin}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.spacing.l,
    paddingTop: Layout.spacing.s,
    paddingBottom: Layout.spacing.xl + 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Layout.spacing.m,
  },
  close: {
    position: 'absolute',
    right: Layout.spacing.m,
    top: Layout.spacing.m,
    padding: 6,
    zIndex: 2,
  },
  logo: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: Layout.spacing.s,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.s,
  },
  body: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.m,
  },
  emailButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Layout.spacing.s,
    ...Layout.shadow.small,
  },
  emailButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyBold,
    color: '#1F2937',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Layout.spacing.m,
  },
  loginText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: Colors.text,
  },
});
