import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { RoundIconButton } from '@/components/buttons';
import { DiscoveryCard } from '@/components/discovery-card';
import { Screen } from '@/components/screen';
import { LoadError, Loading } from '@/components/status';
import { BodyLight, Caption, Eyebrow, ScreenTitle } from '@/components/text';
import { goBack } from '@/lib/nav';
import { useLoad } from '@/lib/use-load';
import { getDiscoveries, markDiscoveriesSeen } from '@/lib/week';
import { colors } from '@/theme/tokens';

/**
 * "What I know about my body": every discovery from their own check-ins,
 * newest first. A collection that only grows, no locked or missing cards.
 */
export default function Discoveries() {
  const { data, error, reload } = useLoad(getDiscoveries);

  useEffect(() => {
    if (data) markDiscoveriesSeen(data.filter((d) => d.isNew).map((d) => d.key));
  }, [data]);

  return (
    <Screen withTopBar gap={24}>
      <View style={styles.topBar}>
        <RoundIconButton icon={ChevronLeft} size={40} accessibilityLabel="Back" onPress={() => goBack('/profile')} />
      </View>
      <View style={{ gap: 12 }}>
        <Eyebrow>Discoveries</Eyebrow>
        <ScreenTitle>What I know about my body</ScreenTitle>
        <BodyLight>
          Things your own check-ins have shown, including what helps. They grow as you check in. For understanding, not
          medical advice.
        </BodyLight>
      </View>

      {error ? (
        <LoadError onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : data.length === 0 ? (
        <View style={styles.empty}>
          <Sparkles size={40} color={colors.textTertiary} strokeWidth={1.5} />
          <BodyLight style={{ textAlign: 'center' }}>
            Your first discoveries usually show up after two or three weeks of check-ins.
          </BodyLight>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <Caption>
            {data.length} {data.length === 1 ? 'discovery' : 'discoveries'} so far
          </Caption>
          {data.map((d) => (
            <DiscoveryCard key={d.key} discovery={d} isNew={d.isNew} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row' },
  empty: { alignItems: 'center', gap: 14, paddingVertical: 40 },
});
