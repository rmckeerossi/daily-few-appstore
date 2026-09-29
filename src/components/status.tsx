import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/theme/tokens';

import { OutlineButton } from './buttons';
import { BodyLight } from './text';

export function Loading() {
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
      <ActivityIndicator color={colors.lilac} />
    </View>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ gap: 16, paddingVertical: 32, alignItems: 'flex-start' }}>
      <BodyLight>We couldn’t load this just now. Check your connection and try again.</BodyLight>
      <OutlineButton label="Try again" onPress={onRetry} />
    </View>
  );
}
