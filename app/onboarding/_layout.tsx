import { Stack } from 'expo-router';

/**
 * Onboarding flow layout.
 *
 * The full sequence, each step earning the next:
 *   quiz         -> 8 taste questions
 *   result       -> the personalised reveal (the value moment) + share
 *   first-cheese -> log one, seeded from the answers just given
 *   wishlist     -> save one for later, then exit to the app
 *
 * The rating ask fires at the end of the wishlist step, not earlier: by then the user
 * has answered the quiz, seen a result and usually logged a cheese, so there is
 * something to have an opinion about.
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
      <Stack.Screen name="first-cheese" />
      <Stack.Screen name="wishlist" />
    </Stack>
  );
}
