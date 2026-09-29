import { router } from 'expo-router';
import { useState } from 'react';

import { PrimaryButton } from '@/components/buttons';
import { Field } from '@/components/form';
import { StepScreen } from '@/components/step';
import { useSignup } from '@/lib/signup';

/** Signup step 1 of 3: first name. */
export default function NameStep() {
  const { draft, update } = useSignup();
  const [name, setName] = useState(draft.firstName);
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    const firstName = name.trim();
    if (!firstName) {
      setError('Add your name.');
      return;
    }
    update({ firstName });
    router.push('/season');
  };

  return (
    <StepScreen step="1 of 3" title="First things first. What should we call you?">
      <Field
        label="First name"
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError(null);
        }}
        placeholder="Your first name"
        autoFocus
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        maxLength={60}
        onSubmitEditing={next}
        error={error}
      />
      <PrimaryButton label="That's me" onPress={next} />
    </StepScreen>
  );
}
