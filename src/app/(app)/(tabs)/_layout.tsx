import { Tabs } from 'expo-router';

import { BottomNav } from '@/components/bottom-nav';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.night } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
      {/* Deck and Draw keep the bottom nav visible but aren't tabs themselves. */}
      <Tabs.Screen name="deck/[id]" options={{ href: null }} />
      <Tabs.Screen name="draw" options={{ href: null }} />
    </Tabs>
  );
}
