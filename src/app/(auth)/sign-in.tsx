import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { Field } from '@/components/form';
import { StepScreen } from '@/components/step';
import { supabase } from '@/lib/supabase';
import { colors, type } from '@/theme/tokens';

/** Returning members: email → code. Never creates an account. */
export default function SignIn() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean.includes('@')) {
      setError('That email is missing an @.');
      return;
    }
    setSending(true);
    setError(null);
    setNotFound(false);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: false },
    });
    setSending(false);
    if (err) {
      if (/signups not allowed|not found/i.test(err.message)) setNotFound(true);
      else if (/rate|seconds|too many/i.test(err.message)) setError('Too many codes sent just now. Wait a minute and try again.');
      else setError('We couldn’t send your code. Check the email and try again.');
      return;
    }
    router.push({ pathname: '/verify', params: { email: clean, mode: 'signin' } });
  };

  return (
    <StepScreen title="Welcome back." subtitle="We’ll email you a code to sign in. No password needed.">
      <Field
        label="Email"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setError(null);
          setNotFound(false);
        }}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus
        returnKeyType="send"
        onSubmitEditing={send}
        error={error}
      />
      {notFound ? (
        <Text style={[type.bodySm, { color: colors.textSecondary }]}>
          We couldn’t find an account with that email.{' '}
        </Text>
      ) : null}
      <PrimaryButton label="Email me a code" onPress={send} loading={sending} />
      {notFound ? <TextButton label="Start with me instead" onPress={() => router.replace('/name')} /> : null}
    </StepScreen>
  );
}
