import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// This is a placeholder tab that's hidden in the tab bar
// The actual add functionality is handled by the floating button
export default function AddScreen() {
  return (
    <View style={styles.container}>
      <Text>Add Screen (Hidden)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});