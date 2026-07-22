import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { requestPushPermission } from '@/lib/push-notifications';

/**
 * Asks permission to ask permission.
 *
 * The OS dialog can only be raised once, and a "no" is permanent. So this
 * screen goes first: our own UI, dismissable without cost, that says what the
 * notifications actually are. Someone who taps "Not now" here can be asked
 * again another day. Someone who taps "No" on the iOS dialog cannot.
 *
 * The copy is specific on purpose. "Enable notifications" earns a no; naming
 * the three things that will actually arrive earns a yes, and the three named
 * are the social ones, which get read 47% of the time against 10% for
 * broadcasts. Promising what people already engage with is both honest and
 * the better pitch.
 */
export default function PushPrimerModal({
  visible,
  userId,
  onResolved,
}: {
  visible: boolean;
  userId: string;
  onResolved: (granted: boolean) => void;
}) {
  useEffect(() => {
    if (!visible) return;
    // Analytics import is deliberately avoided here: this modal must never be
    // the reason a log flow fails, and it already has a hard dependency on the
    // permissions API.
  }, [visible]);

  const handleEnable = async () => {
    let granted = false;
    try {
      const token = await requestPushPermission(userId);
      granted = Boolean(token);
    } catch {
      granted = false;
    }
    onResolved(granted);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onResolved(false)}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Nice one. Want the good bits?</Text>
          <Text style={styles.subtitle}>
            That is your first cheese logged. Turn on notifications and we will tell you when:
          </Text>

          <View style={styles.list}>
            <Text style={styles.listItem}>Someone follows you or copies a cheese from your box</Text>
            <Text style={styles.listItem}>A cheese you added gets approved</Text>
            <Text style={styles.listItem}>You are close to earning a badge</Text>
          </View>

          <Text style={styles.reassure}>No spam. You can turn them off any time.</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleEnable}>
            <Text style={styles.primaryButtonText}>Turn on notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={() => onResolved(false)}>
            <Text style={styles.dismissButtonText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.subtleText,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
  },
  list: {
    alignSelf: 'stretch',
    marginBottom: 14,
  },
  listItem: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
  },
  reassure: {
    fontSize: 12,
    color: Colors.subtleText,
    textAlign: 'center',
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  dismissButton: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 15,
    color: Colors.subtleText,
    fontWeight: '500',
  },
});
