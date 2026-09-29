import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { Field } from '@/components/form';
import { StepScreen } from '@/components/step';
import { useSession } from '@/lib/session';
import { useSignup } from '@/lib/signup';
import { supabase } from '@/lib/supabase';
import { colors, type } from '@/theme/tokens';

const RESEND_AFTER = 60;

/** Enter the code from the email. Signing in happens here. */
export default function Verify() {
  const { email, mode } = useLocalSearchParams<{ email: string; mode?: 'signup' | 'signin' }>();
  const { setJustSignedUp } = useSession();
  const { reset } = useSignup();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [wait, setWait] = useState(RESEND_AFTER);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const verify = async (value = code) => {
    const token = value.replace(/\D/g, '');
    if (token.length < 6) {
      setError('Enter the code from the email.');
      return;
    }
    setChecking(true);
    setError(null);
    if (mode === 'signup') setJustSignedUp(true);
    const { error: err } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (err) {
      setJustSignedUp(false);
      setChecking(false);
      setError(/expired/i.test(err.message) ? 'That code has expired. Send a new one.' : 'That code didn’t work. Check it and try again.');
      return;
    }
    // Signed in: the app switches screens on its own.
    reset();
  };

  const resend = async () => {
    setWait(RESEND_AFTER);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (err) setError('We couldn’t send a new code. Try again in a minute.');
    else setResent(true);
  };

  return (
    <StepScreen title="Check your email." subtitle={`We sent a code to ${email}. It works for a few minutes.`}>
      <Field
        label="Code"
        value={code}
        onChangeText={(t) => {
          const next = t.replace(/\D/g, '').slice(0, 8);
          setCode(next);
          setError(null);
        }}
        placeholder="123456"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoFocus
        maxLength={8}
        style={{ fontSize: 22, letterSpacing: 6 }}
        error={error}
      />
      <View style={{ gap: 20, alignItems: 'center' }}>
        <PrimaryButton label="Continue" onPress={() => verify()} loading={checking} style={{ alignSelf: 'stretch' }} />
        {wait > 0 ? (
          <Text style={[type.caption, { color: colors.textTertiary }]}>
            {resent ? 'New code sent. ' : ''}You can ask for another code in {wait}s.
          </Text>
        ) : (
          <TextButton label="Send a new code" onPress={resend} />
        )}
      </View>
    </StepScreen>
  );
}
