import { View } from 'react-native';

import { OutlineButton } from '@/components/buttons';
import { Screen } from '@/components/screen';
import { BodyLight, DisplayL } from '@/components/text';
import { useSession } from '@/lib/session';

// Signed in, but no profile: only possible for an account created outside the
// signup flow. Sign in with Apple will complete the profile here in a later step.
export default function FinishSetup() {
  const { signOut, refreshProfile } = useSession();
  return (
    <Screen gutter={24} gap={24} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <DisplayL>Let’s finish setting you up.</DisplayL>
      <BodyLight>We couldn’t find your details. Try again, or sign out and start with me to set up your account.</BodyLight>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <OutlineButton label="Try again" onPress={refreshProfile} />
        <OutlineButton label="Sign out" onPress={signOut} />
      </View>
    </Screen>
  );
}
