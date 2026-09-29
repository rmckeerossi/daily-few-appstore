import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';

import { LockGate } from '@/components/lock-screen';
import { ToastProvider } from '@/components/toast';
import { crashReportingEnabled, Sentry } from '@/lib/crash-reporting';
import { SessionProvider, useSession } from '@/lib/session';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'IvarDisplayCondensed-Medium': require('@/assets/fonts/IvarDisplayCondensed-Medium.otf'),
    'IvarDisplay-MediumItalic': require('@/assets/fonts/IvarDisplay-MediumItalic.otf'),
    'NHaasGroteskDSPro-55Rg': require('@/assets/fonts/NHaasGroteskDSPro-55Rg.otf'),
    'NHaasGroteskDSPro-65Md': require('@/assets/fonts/NHaasGroteskDSPro-65Md.otf'),
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </ToastProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

// Catches crashes anywhere in the app once crash reporting is switched on.
export default crashReportingEnabled ? Sentry.wrap(RootLayout) : RootLayout;

function RootNavigator() {
  const { session, profile, isLoading, profileLoading } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  const ready = !!session && !profileLoading;

  return (
    <LockGate signedIn={!!session}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night } }}>
        <Stack.Protected guard={ready && !!profile}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={ready && !profile}>
          <Stack.Screen name="finish-setup" />
        </Stack.Protected>
        <Stack.Protected guard={!ready}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        {/* Shared card links, whether or not anyone is signed in. */}
        <Stack.Screen name="c/[id]" />
      </Stack>
    </LockGate>
  );
}
