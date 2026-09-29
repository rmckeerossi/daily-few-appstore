import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { OutlineButton } from '@/components/buttons';
import { Screen } from '@/components/screen';
import { BodyLight } from '@/components/text';
import { colors, fonts, type } from '@/theme/tokens';

/** Shown instead of creating an account when the birthday is under 18. */
export default function TooYoung() {
  return (
    <Screen gutter={24} gap={24} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Text style={[type.displayL, { color: colors.textPrimary }]}>
        Come back when you’re <Text style={{ fontFamily: fonts.displayLightItalic }}>18.</Text>
      </Text>
      <BodyLight>
        This space is for adults 18 and up. We’d love to see you here when you’re ready. We didn’t create an account or
        keep any of your details.
      </BodyLight>
      <View style={{ alignItems: 'flex-start' }}>
        <OutlineButton label="Back" onPress={() => router.dismissTo('/')} />
      </View>
    </Screen>
  );
}
