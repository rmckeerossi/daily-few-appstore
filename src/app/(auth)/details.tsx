import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, View, type TextInput } from 'react-native';

import { PrimaryButton } from '@/components/buttons';
import { Checkbox, Field, FieldButton } from '@/components/form';
import { StepScreen } from '@/components/step';
import { Caption } from '@/components/text';
import { ageOn, localDate, timeZone } from '@/lib/dates';
import { useSignup } from '@/lib/signup';
import { supabase } from '@/lib/supabase';
import { colors, type } from '@/theme/tokens';

const MIN_AGE = 18;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatBirthday = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const digits = (s: string) => s.replace(/\D/g, '');

type Errors = Partial<Record<'email' | 'birthday' | 'phone' | 'form', string>>;

/** Signup step 3 of 3: email, birthday, optional phone, marketing consent. */
export default function DetailsStep() {
  const { draft, update, reset } = useSignup();
  const [email, setEmail] = useState(draft.email);
  const [birthday, setBirthday] = useState<Date | null>(draft.birthday);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [phone, setPhone] = useState(draft.phone);
  const [emailConsent, setEmailConsent] = useState(draft.emailConsent);
  const [textConsent, setTextConsent] = useState(draft.textConsent);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const phoneRef = useRef<TextInput>(null);

  const hasPhone = digits(phone).length > 0;

  const submit = async () => {
    const next: Errors = {};
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) next.email = 'Add your email.';
    else if (!EMAIL.test(cleanEmail)) next.email = 'That email is missing an @.';
    if (!birthday) next.birthday = 'Add your birthday.';
    if (hasPhone && digits(phone).length !== 10) next.phone = 'Add a 10-digit phone number.';
    setErrors(next);
    if (Object.keys(next).length > 0 || !birthday) return;

    // Under 18: stop here. Nothing is sent and nothing is kept (PRD §3 Flow A).
    if (ageOn(birthday) < MIN_AGE) {
      reset();
      router.replace('/too-young');
      return;
    }

    update({ email: cleanEmail, birthday, phone, emailConsent, textConsent: hasPhone && textConsent });
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
        // Read by the database when the account is created (handle_new_user),
        // which checks the age again and creates the profile.
        data: {
          first_name: draft.firstName,
          season_id: draft.seasonId,
          birthday: localDate(birthday),
          phone: hasPhone ? digits(phone) : null,
          email_consent: emailConsent,
          text_consent: hasPhone && textConsent,
          timezone: timeZone(),
        },
      },
    });
    setSending(false);

    if (error) {
      if (__DEV__) console.warn(`signInWithOtp failed (${error.status} ${error.code}): ${error.message}`);
      setErrors({
        form: /rate|seconds|too many/i.test(error.message)
          ? 'Too many codes sent just now. Wait a minute and try again.'
          : 'We couldn’t send your code. Check the email and try again.',
      });
      return;
    }
    router.push({ pathname: '/verify', params: { email: cleanEmail, mode: 'signup' } });
  };

  return (
    <StepScreen
      step="3 of 3"
      title="Last thing. Let’s keep your answers safe."
      subtitle="Your answers are private. Only you will ever see them.">
      <View style={{ gap: 18 }}>
        <Field
          label="Email"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setErrors((e) => ({ ...e, email: undefined }));
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => setPickerOpen(true)}
          error={errors.email}
        />

        <View style={{ gap: 8 }}>
          <FieldButton
            label="Birthday"
            value={birthday ? formatBirthday(birthday) : null}
            placeholder="Month, day, year"
            onPress={() => setPickerOpen((open) => !open)}
            error={errors.birthday}
          />
          {pickerOpen ? (
            <DateTimePicker
              value={birthday ?? new Date(1995, 0, 1)}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              themeVariant="dark"
              textColor={colors.paleCream}
              onValueChange={(_, date) => {
                setBirthday(date);
                setErrors((e) => ({ ...e, birthday: undefined }));
              }}
            />
          ) : null}
        </View>

        <Field
          ref={phoneRef}
          label="Phone · optional"
          hint="For text updates"
          value={phone}
          onChangeText={(t) => {
            setPhone(t);
            setErrors((e) => ({ ...e, phone: undefined }));
            if (!digits(t)) setTextConsent(false);
          }}
          placeholder="(555) 555-0123"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          onFocus={() => setPickerOpen(false)}
          error={errors.phone}
        />
      </View>

      <View style={{ gap: 14 }}>
        <Checkbox checked={emailConsent} onChange={setEmailConsent}>
          Email me about new decks and updates
        </Checkbox>
        <Checkbox checked={textConsent} onChange={setTextConsent} disabled={!hasPhone}>
          Text me about new decks and updates
        </Checkbox>
      </View>

      <View style={{ gap: 14 }}>
        {errors.form ? <Text style={[type.caption, { color: colors.errorOnDark }]}>{errors.form}</Text> : null}
        <PrimaryButton label="Show me my first card" onPress={submit} loading={sending} />
        <Caption style={{ textAlign: 'center' }}>
          You must be 18 or older. Your answers are only ever visible to you.
        </Caption>
      </View>
    </StepScreen>
  );
}
