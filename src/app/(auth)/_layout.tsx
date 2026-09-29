import { Stack } from 'expo-router';

import { SignupProvider } from '@/lib/signup';
import { colors } from '@/theme/tokens';

export default function AuthLayout() {
  return (
    <SignupProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="too-young" options={{ gestureEnabled: false }} />
      </Stack>
    </SignupProvider>
  );
}
