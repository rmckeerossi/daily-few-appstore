import { useEffect, useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';

import { colors, type } from '@/theme/tokens';

/**
 * Top-right "Done" while the keyboard is up (like Notes), so putting the
 * keyboard away is always one tap. Takes the same space as a 40pt icon button
 * when hidden, so the top bar doesn't shift.
 */
export function KeyboardDone() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <View style={{ minWidth: 40, alignItems: 'flex-end' }}>
      {visible ? (
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => Keyboard.dismiss()}>
          <Text style={[type.button, { color: colors.lilac }]}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
