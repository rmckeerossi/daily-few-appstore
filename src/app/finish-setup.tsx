import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { OutlineButton, PrimaryButton, TextButton } from '@/components/buttons';
import { Checkbox, Chip, Field, FieldButton } from '@/components/form';
import { Screen } from '@/components/screen';
import { BodyLight, Caption, DisplayL, Eyebrow } from '@/components/text';
import { appleName, completeProfile, markTooYoung, takePendingSignup } from '@/lib/apple';
import { deleteMyAccount, getSeasons, type Season } from '@/lib/data';
import { ageOn } from '@/lib/dates';
import { useSession } from '@/lib/session';
import { colors, type } from '@/theme/tokens';

const digits = (s: string) => s.replace(/\D/g, '');

/**
 * Signed in, but no profile yet. This happens with Sign in with Apple, where the
 * account exists before the details do:
 * - chose Apple at signup step 3: finish it straight away from what they entered;
 * - first-time Apple sign-in from "I already have an account": ask for details.
 * Under 18 deletes the new account at once (PRD §6).
 */
export default function FinishSetup() {
  const { session, signOut, refreshProfile, setJustSignedUp } = useSession();
  const [pending] = useState(takePendingSignup);
  const [error, setError] = useState<string | null>(null);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [firstName, setFirstName] = useState(appleName() ?? '');
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [emailConsent, setEmailConsent] = useState(false);
  const [textConsent, setTextConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  // Coming straight from signup with Apple: everything is already here.
  useEffect(() => {
    if (!pending) return;
    completeProfile(pending)
      .then(() => refreshProfile())
      .catch(() => setError('We couldn’t finish setting you up. Check your connection and try again.'));
  }, [pending, refreshProfile]);

  useEffect(() => {
    if (!pending) getSeasons().then(setSeasons, () => {});
  }, [pending]);

  if (pending && !error) {
    return (
      <Screen gap={24} contentStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.lilac} />
        <BodyLight>Setting things up…</BodyLight>
      </Screen>
    );
  }

  const hasPhone = digits(phone).length > 0;

  const submit = async () => {
    if (!firstName.trim()) return setError('Add your name.');
    if (!birthday) return setError('Add your birthday.');
    if (hasPhone && digits(phone).length !== 10) return setError('Add a 10-digit phone number.');
    setError(null);
    setSaving(true);
    try {
      if (ageOn(birthday) < 18) {
        // No account for under-18s: remove the one Apple just created.
        markTooYoung();
        await deleteMyAccount(session!.user.id);
        return;
      }
      await completeProfile({
        firstName: firstName.trim(),
        seasonId,
        email: session?.user.email ?? '',
        birthday,
        phone,
        emailConsent,
        textConsent: hasPhone && textConsent,
      });
      setJustSignedUp(true);
      await refreshProfile();
    } catch {
      setSaving(false);
      setError('That didn’t save. Try again.');
    }
  };

  return (
    <Screen keyboard gutter={24} gap={28}>
      <View style={{ gap: 14 }}>
        <DisplayL>Nice to meet you. A few details first.</DisplayL>
        <BodyLight>Your answers are private. Only you will ever see them.</BodyLight>
      </View>

      <Field label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" maxLength={60} />

      <View style={{ gap: 12 }}>
        <Eyebrow>Where are you right now?</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {seasons.map((s) => (
            <Chip key={s.id} label={s.name} selected={seasonId === s.id} onPress={() => setSeasonId(s.id)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <FieldButton
          label="Birthday"
          value={birthday ? birthday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null}
          placeholder="Month, day, year"
          onPress={() => setPickerOpen((o) => !o)}
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
            onValueChange={(_, date) => setBirthday(date)}
          />
        ) : null}
      </View>

      <Field
        label="Phone · optional"
        hint="For text updates"
        value={phone}
        onChangeText={(t) => {
          setPhone(t);
          if (!digits(t)) setTextConsent(false);
        }}
        keyboardType="phone-pad"
        onFocus={() => setPickerOpen(false)}
      />

      <View style={{ gap: 14 }}>
        <Checkbox checked={emailConsent} onChange={setEmailConsent}>
          Send me the Daily Few newsletter, with new decks, reflections, and the few things we love.
        </Checkbox>
        <Checkbox checked={textConsent} onChange={setTextConsent} disabled={!hasPhone}>
          Text me about new decks and updates
        </Checkbox>
      </View>

      <View style={{ gap: 14, alignItems: 'center' }}>
        {error ? <Text style={[type.caption, { color: colors.errorOnDark }]}>{error}</Text> : null}
        <PrimaryButton label="Show me my first card" onPress={submit} loading={saving} style={{ alignSelf: 'stretch' }} />
        <Caption style={{ textAlign: 'center' }}>You must be 18 or older.</Caption>
        {pending ? <OutlineButton label="Try again" onPress={() => refreshProfile()} /> : null}
        <TextButton label="Sign out" onPress={signOut} />
      </View>
    </Screen>
  );
}
