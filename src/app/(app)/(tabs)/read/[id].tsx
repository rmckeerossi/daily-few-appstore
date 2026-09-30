import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, ChevronLeft } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { PrimaryButton, RoundIconButton } from '@/components/buttons';
import { Markdown } from '@/components/markdown';
import { Screen } from '@/components/screen';
import { LoadError, Loading } from '@/components/status';
import { BodyLight, Caption, Eyebrow } from '@/components/text';
import { goBack } from '@/lib/nav';
import { getRead } from '@/lib/reads';
import { useLoad } from '@/lib/use-load';
import { colors, fonts } from '@/theme/tokens';

/** One short read, ending with a card to reflect on it. */
export default function ReadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, reload } = useLoad(() => getRead(id), id);
  const read = data?.id === id ? data : null;

  return (
    <Screen withNav withTopBar gap={24}>
      <RoundIconButton icon={ChevronLeft} size={40} accessibilityLabel="Back" onPress={() => goBack('/library')} />

      {error ? (
        <LoadError onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : !read ? (
        <BodyLight>This read isn’t available anymore.</BodyLight>
      ) : (
        <>
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BookOpen size={14} color={colors.lilac} strokeWidth={1.5} />
              <Eyebrow color={colors.lilac}>Short read · {read.minutes} min</Eyebrow>
            </View>
            <Text style={{ fontFamily: fonts.displayLight, fontSize: 38, lineHeight: 40, color: colors.textPrimary }}>
              {read.title}
            </Text>
          </View>

          <Markdown source={read.body} />

          {read.card_deck ? (
            <View style={{ gap: 12, marginTop: 8 }}>
              <Eyebrow>Sit with it</Eyebrow>
              <PrimaryButton
                label="Pull a card about this"
                onPress={() => router.push(`/deck/${read.card_deck}`)}
              />
            </View>
          ) : null}

          <Caption>For understanding, not medical advice. If something here sounds like you, it’s worth bringing up with your doctor.</Caption>
        </>
      )}
    </Screen>
  );
}
