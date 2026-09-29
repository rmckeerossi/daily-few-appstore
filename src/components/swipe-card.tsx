import * as Haptics from 'expo-haptics';
import { useEffect, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const DISTANCE = 110; // how far to drag before letting go sends it
const FLICK = 800; // or a quick flick at this speed (pt/s)

/**
 * Tinder-style: drag the card sideways and it tilts; let go past the threshold
 * (or flick) and it flies off that side, then `onSwiped` runs and the next card
 * fades up in its place. A short drag eases back. No bounce, per the motion rules.
 * `cardKey` must change when a new card is shown.
 */
export function SwipeCard({ cardKey, onSwiped, enabled = true, children }: {
  cardKey: string;
  onSwiped: (direction: 'left' | 'right') => void;
  enabled?: boolean;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(1);
  const lift = useSharedValue(0);
  const cameFromSwipe = useSharedValue(false);

  const done = (direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSwiped(direction);
  };

  // A new card after a swipe fades and rises into the centre.
  useEffect(() => {
    if (!cameFromSwipe.get()) return;
    cameFromSwipe.set(false);
    x.set(0);
    y.set(0);
    opacity.set(0);
    lift.set(14);
    opacity.set(withTiming(1, { duration: 240 }));
    lift.set(withTiming(0, { duration: 420, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
  }, [cardKey, x, y, opacity, lift, cameFromSwipe]);

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-12, 12])
    .failOffsetY([-24, 24])
    .onUpdate((e) => {
      x.set(e.translationX);
      y.set(e.translationY * 0.2);
    })
    .onEnd((e) => {
      const goes = Math.abs(e.translationX) > DISTANCE || Math.abs(e.velocityX) > FLICK;
      if (!goes) {
        x.set(withTiming(0, { duration: 200 }));
        y.set(withTiming(0, { duration: 200 }));
        return;
      }
      const dir = (Math.abs(e.translationX) > DISTANCE ? e.translationX : e.velocityX) > 0 ? 1 : -1;
      opacity.set(withTiming(0, { duration: 220 }));
      x.set(
        withTiming(dir * width * 1.3, { duration: 240 }, (finished) => {
          if (!finished) return;
          cameFromSwipe.set(true);
          scheduleOnRN(done, dir > 0 ? 'right' : 'left');
        }),
      );
    });

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [
      { translateX: x.get() },
      { translateY: y.get() + lift.get() },
      { rotate: `${x.get() / 22}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
