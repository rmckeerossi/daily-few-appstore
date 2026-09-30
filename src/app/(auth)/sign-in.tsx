import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AppleButton } from '@/components/apple-button';
import { PrimaryButton, TextButton } from '@/components/buttons';
import { Field } from '@/components/form';
import { StepScreen } from '@/components/step';
import { signInWithApple } from '@/lib/apple';
import { supabase } from '@/lib/supabase';
import { colors, type } from '@/theme/tokens';

// App Review can't receive emailed codes, so this one account signs in with a
// password instead (details go in App Store Connect's review notes). Every
// other account only ever signs in with a code.
const REVIEW_EMAIL = 'appreview@dailyfew.com';

/** Returning members: email → code. Never creates an account. */
export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [sending, setSending] = useState(false);

  const isReviewer = email.trim().toLowerCase() === REVIEW_EMAIL;

  const reviewerSignIn = async () => {
    setSending(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: REVIEW_EMAIL, password });
    setSending(false);
    // Signed in: the app switches screens on its own.
    if (err) setError('That password didn’t work.');
  };

  const send = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean.includes('@')) {
      setError('That email is missing an @.');
      return;
    }
    if (clean === REVIEW_EMAIL) return reviewerSignIn();
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

  // A brand-new Apple account has no profile yet; the app then asks for their
  // details (finish-setup), with the same 18+ check as email signup.
  const apple = async () => {
    setError(null);
    try {
      await signInWithApple();
    } catch {
      setError('Sign in with Apple didn’t work. Try again, or use your email.');
    }
  };

  return (
    <StepScreen title="Welcome back." subtitle="We’ll email you a code to sign in. No password needed.">
      <AppleButton onPress={apple} />
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
        returnKeyType={isReviewer ? 'next' : 'send'}
        onSubmitEditing={isReviewer ? undefined : send}
        error={isReviewer ? null : error}
      />
      {isReviewer ? (
        <Field
          label="Password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={reviewerSignIn}
          error={error}
        />
      ) : null}
      {notFound ? (
        <Text style={[type.bodySm, { color: colors.textSecondary }]}>
          We couldn’t find an account with that email.{' '}
        </Text>
      ) : null}
      <PrimaryButton label={isReviewer ? 'Sign in' : 'Email me a code'} onPress={send} loading={sending} />
      {notFound ? <TextButton label="Start with me instead" onPress={() => router.replace('/name')} /> : null}
    </StepScreen>
  );
}
