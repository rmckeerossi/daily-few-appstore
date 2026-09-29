import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, type } from '@/theme/tokens';

const SIZE = 286;
const RADIUS = 128;

/**
 * One dot per day of the month, from 12 o'clock clockwise. Past days are lilac
 * when something was saved that day; today glows; future days are outlined.
 * The centre counts the days left until the month turns.
 */
export function MonthRing({ today, reflectedDays }: { today: Date; reflectedDays: Set<number> }) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysLeft = daysInMonth - day + 1;
  const monthLabel = today.toLocaleString('en-US', { month: 'long' });

  return (
    <View
      style={styles.ring}
      accessible
      accessibilityLabel={`${reflectedDays.size} days with something saved in ${monthLabel}. ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} until your ${monthLabel} recap.`}>
      {Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const angle = (i / daysInMonth) * 2 * Math.PI - Math.PI / 2;
        const isToday = d === day;
        const size = isToday ? 16 : 9;
        const x = SIZE / 2 + RADIUS * Math.cos(angle) - size / 2;
        const y = SIZE / 2 + RADIUS * Math.sin(angle) - size / 2;
        const reflected = reflectedDays.has(d);
        return (
          <View
            key={d}
            style={[
              styles.dot,
              { left: x, top: y, width: size, height: size, borderRadius: size / 2 },
              isToday
                ? [styles.today, reflected && { backgroundColor: colors.lilac }]
                : d < day
                  ? { backgroundColor: reflected ? colors.lilac : 'rgba(254,252,242,0.16)' }
                  : styles.future,
            ]}
          />
        );
      })}
      <View style={styles.center}>
        <Text style={[type.label, { color: colors.lilac }]}>{monthLabel}</Text>
        <Text style={{ fontFamily: fonts.displayLight, fontSize: 52, lineHeight: 56, color: colors.textPrimary }}>
          {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
        </Text>
        <Text style={[type.bodySm, { color: colors.textSecondary, textAlign: 'center', maxWidth: 150 }]}>
          until your {monthLabel} recap
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { width: SIZE, height: SIZE, alignSelf: 'center' },
  dot: { position: 'absolute' },
  future: { borderWidth: 1, borderColor: 'rgba(254,252,242,0.28)' },
  today: {
    borderWidth: 1,
    borderColor: colors.paleCream,
    boxShadow: '0 0 0 4px rgba(209,219,255,0.18), 0 0 18px rgba(209,219,255,0.6)',
  },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 6 },
});
