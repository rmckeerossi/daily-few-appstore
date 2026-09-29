import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appleSignInAvailable } from '@/lib/apple';
import { colors, type } from '@/theme/tokens';

/**
 * Apple's own "Continue with Apple" button (Apple requires its standard look),
 * with an "or" divider below (or above) it. Renders nothing where Apple
 * sign-in isn't available, such as in Expo Go.
 */
export function AppleButton({ onPress, orPosition = 'below' }: {
  onPress: () => void;
  orPosition?: 'above' | 'below';
}) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    appleSignInAvailable().then(setAvailable, () => setAvailable(false));
  }, []);

  if (!available) return null;

  const or = (
    <View style={styles.or}>
      <View style={styles.line} />
      <Text style={[type.labelSm, { color: colors.textTertiary }]}>or</Text>
      <View style={styles.line} />
    </View>
  );

  return (
    <View style={{ gap: 18 }}>
      {orPosition === 'above' ? or : null}
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={27}
        style={{ height: 54 }}
        onPress={onPress}
      />
      {orPosition === 'below' ? or : null}
    </View>
  );
}

const styles = StyleSheet.create({
  or: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: colors.divider },
});
