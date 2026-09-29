import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { StepScreen } from '@/components/step';
import { Caption } from '@/components/text';
import { getSeasons, type Season } from '@/lib/data';
import { useSignup } from '@/lib/signup';
import { colors, radius, type } from '@/theme/tokens';

/** Signup step 2 of 3: season of life. One tap moves forward. */
export default function SeasonStep() {
  const { draft, update } = useSignup();
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getSeasons().then(setSeasons, () => setError(true));
  }, []);

  const choose = (id: string) => {
    update({ seasonId: id });
    router.push('/details');
  };

  return (
    <StepScreen
      step="2 of 3"
      title={`Nice to meet you, ${draft.firstName}. Where are you right now?`}
      subtitle="No wrong answers. You can change this anytime.">
      {error ? (
        <Caption>We couldn’t load this just now. Check your connection and go back to try again.</Caption>
      ) : !seasons ? (
        <ActivityIndicator color={colors.lilac} />
      ) : (
        <View style={{ gap: 10 }}>
          {seasons.map((s) => {
            const selected = draft.seasonId === s.id;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => choose(s.id)}
                style={({ pressed }) => [
                  styles.option,
                  (selected || pressed) && styles.optionActive,
                ]}>
                {({ pressed }) => (
                  <>
                    <Text style={[type.categoryName, { color: selected || pressed ? colors.burgundy : colors.textPrimary }]}>
                      {s.name}
                    </Text>
                    {s.description ? (
                      <Text style={[type.bodySm, { color: selected || pressed ? colors.burgundy600 : colors.textSecondary }]}>
                        {s.description}
                      </Text>
                    ) : null}
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  option: {
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radius.category,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  optionActive: { backgroundColor: colors.lilac, borderColor: colors.lilac },
});
