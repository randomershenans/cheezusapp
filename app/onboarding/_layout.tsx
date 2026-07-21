import { Stack } from 'expo-router';

/**
 * Onboarding flow layout — the taste quiz.
 *
 * - No header.
 * - Swipe-back disabled on iOS (users should use the Skip link, not gestures,
 *   to exit the quiz — otherwise they bypass the analytics event).
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="quiz" />
      <Stack.Screen name="result" />
    </Stack>
  );
}
