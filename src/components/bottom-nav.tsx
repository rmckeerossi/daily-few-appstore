import { router, type Href, type Tabs } from 'expo-router';
import {
  BookOpen,
  Image as ImageIcon,
  Layers,
  Moon,
  PenLine,
  Plus,
  Shuffle,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { getQuickDrawTarget } from '@/lib/data';
import { colors } from '@/theme/tokens';

import { Sheet, SheetOption } from './sheet';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ITEMS: Record<string, { icon: LucideIcon; label: string }> = {
  index: { icon: Moon, label: 'Home' },
  library: { icon: Layers, label: 'Library' },
  history: { icon: BookOpen, label: 'History' },
  profile: { icon: UserRound, label: 'Profile' },
};

/**
 * Icon-only nav with a solid "Pull a card" button in the middle
 * (Home · Library · + · History · Profile), over a fade into the background.
 */
export function BottomNav({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const routes = state.routes.filter((r) => r.name in ITEMS);
  const current = state.routes[state.index]?.name;
  // Deck and Draw live under Library.
  const activeName = current && !(current in ITEMS) ? 'library' : current;

  const item = (route: (typeof routes)[number]) => {
    const { icon: Icon, label } = ITEMS[route.name];
    const focused = activeName === route.name;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (current !== route.name && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        style={[styles.item, focused && styles.itemActive]}>
        <Icon size={22} strokeWidth={1.5} color={focused ? colors.lilac : colors.textTertiary} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="navFade" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={colors.night} stopOpacity={1} />
            <Stop offset="0.55" stopColor={colors.night} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.night} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#navFade)" />
      </Svg>
      {routes.slice(0, 2).map(item)}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add to this month"
        onPress={() => setMenuOpen(true)}
        style={({ pressed }) => [styles.pull, (pressed || menuOpen) && { transform: [{ scale: 0.95 }] }]}>
        <View style={{ transform: [{ rotate: menuOpen ? '45deg' : '0deg' }] }}>
          <Plus size={22} strokeWidth={1.5} color={colors.burgundy} />
        </View>
      </Pressable>
      {routes.slice(2).map(item)}
      <AddMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

/** The + menu: draw a card, write about today, or add a moment. */
function AddMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [drawing, setDrawing] = useState(false);

  const go = (href: Href) => {
    onClose();
    router.push(href);
  };

  const draw = async () => {
    setDrawing(true);
    try {
      const target = await getQuickDrawTarget();
      go(target ? { pathname: '/draw', params: { ...target, at: String(Date.now()) } } : '/library');
    } catch {
      go('/library');
    } finally {
      setDrawing(false);
    }
  };

  const icon = (Icon: LucideIcon) => <Icon size={20} strokeWidth={1.6} color={colors.paleCream} />;

  return (
    <Sheet open={open} onClose={onClose} title="Add to this month">
      <View style={{ gap: 12 }}>
        <SheetOption
          icon={icon(Shuffle)}
          title="Draw a card"
          body={drawing ? 'Finding your deck…' : 'Pull a question from this month’s deck.'}
          onPress={draw}
        />
        <SheetOption
          icon={icon(PenLine)}
          title="Write about today"
          body="A few free words, with photos if you like."
          onPress={() => go({ pathname: '/entry', params: { kind: 'write' } })}
        />
        <SheetOption
          icon={icon(ImageIcon)}
          title="Add a moment"
          body="One to three photos for something worth keeping."
          onPress={() => go({ pathname: '/entry', params: { kind: 'moment' } })}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 22,
    paddingHorizontal: 18,
  },
  item: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  itemActive: { backgroundColor: 'rgba(209,219,255,0.16)' },
  pull: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.paleCream,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(40,14,26,0.30)',
  },
});
