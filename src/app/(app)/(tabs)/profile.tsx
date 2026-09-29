import { LogOut, Pencil, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/form';
import { BrandGradient } from '@/components/gradients';
import { Screen } from '@/components/screen';
import { Sheet, SheetButton } from '@/components/sheet';
import { BodySm, Caption, Eyebrow } from '@/components/text';
import { useToast } from '@/components/toast';
import { ToggleRow } from '@/components/toggle';
import {
  deleteMyAccount,
  getDecks,
  getSeasons,
  seasonDeck,
  updateProfile,
  type ProfilePatch,
  type Season,
} from '@/lib/data';
import { timeZone } from '@/lib/dates';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, type } from '@/theme/tokens';

const TIMES = [
  { value: '07:30', label: '7:30 AM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:30', label: '9:30 PM' },
];
const DEFAULT_TIME = '20:00';

const digits = (s: string) => s.replace(/\D/g, '');

const formatPhone = (p: string | null) => {
  const d = digits(p ?? '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (p ?? '');
};

export default function Profile() {
  const { profile, session, signOut, refreshProfile } = useSession();
  const toast = useToast();
  const [seasons, setSeasons] = useState<Season[]>([]);
  // Optimistic copy so switches and chips respond instantly.
  const [local, setLocal] = useState<ProfilePatch>({});
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getSeasons().then(setSeasons, () => {});
  }, []);

  if (!profile || !session) return null;
  const p = { ...profile, ...local };
  const hasPhone = digits(p.phone ?? '').length > 0;

  const save = async (patch: ProfilePatch, message?: string) => {
    setLocal((l) => ({ ...l, ...patch }));
    try {
      await updateProfile(profile.id, patch);
      await refreshProfile();
      setLocal({});
      if (message) toast(message);
    } catch {
      setLocal({});
      toast('That didn’t save. Try again.');
    }
  };

  const chooseSeason = async (id: string) => {
    if (id === p.season_id) return;
    let message = 'Season updated.';
    try {
      const deck = seasonDeck(await getDecks(), id);
      message = deck ? `Now recommending ${deck.name}.` : 'We’ll recommend this month’s deck.';
    } catch {}
    save({ season_id: id }, message);
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount(profile.id);
      // Signed out: the app returns to the welcome screen on its own.
    } catch {
      setDeleting(false);
      toast('We couldn’t delete your account. Try again.');
    }
  };

  const initial = p.first_name.trim().charAt(0).toUpperCase() || '?';

  return (
    <Screen withNav gap={32}>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit your name and phone" onPress={() => setEditOpen(true)} style={styles.header}>
        <View style={styles.avatar}>
          <BrandGradient />
          <Text style={{ fontFamily: fonts.displayLight, fontSize: 28, color: colors.paleCream }}>{initial}</Text>
        </View>
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={[type.greeting, { fontSize: 32, color: colors.textPrimary }]}>{p.first_name}</Text>
          <BodySm>{session.user.email}</BodySm>
          {p.phone ? <BodySm>{formatPhone(p.phone)}</BodySm> : null}
        </View>
        <Pencil size={18} color={colors.textTertiary} strokeWidth={1.5} />
      </Pressable>

      <View style={{ gap: 14 }}>
        <Eyebrow>Season of life</Eyebrow>
        <View style={styles.chips}>
          {seasons.map((s) => (
            <Chip key={s.id} label={s.name} selected={p.season_id === s.id} onPress={() => chooseSeason(s.id)} />
          ))}
        </View>
        <Caption>Changes which deck we recommend on home.</Caption>
      </View>

      <View>
        <Eyebrow>Reminders and updates</Eyebrow>
        <ToggleRow
          label="Daily reminder"
          description="A push at your chosen time that opens today’s card."
          value={p.reminder_enabled}
          onChange={(on) =>
            save(
              on
                ? { reminder_enabled: true, reminder_time: p.reminder_time?.slice(0, 5) ?? DEFAULT_TIME, timezone: timeZone() }
                : { reminder_enabled: false },
              on ? 'Daily reminder on.' : 'Daily reminder off.',
            )
          }>
          {p.reminder_enabled ? (
            <View style={styles.chips}>
              {TIMES.map((t) => (
                <Chip
                  key={t.value}
                  label={t.label}
                  selected={(p.reminder_time ?? DEFAULT_TIME).slice(0, 5) === t.value}
                  onPress={() => save({ reminder_time: t.value, timezone: timeZone() }, `Reminder set for ${t.label}.`)}
                />
              ))}
            </View>
          ) : null}
        </ToggleRow>
        <ToggleRow
          label="Email updates"
          description="New decks and product news."
          value={p.email_consent}
          onChange={(on) => save({ email_consent: on })}
        />
        <ToggleRow
          label="Text updates"
          description={hasPhone ? 'New decks and product news.' : 'Add a phone number to get texts.'}
          value={p.text_consent}
          disabled={!hasPhone}
          onChange={(on) => save({ text_consent: on })}
        />
        {!hasPhone ? (
          <Pressable accessibilityRole="button" onPress={() => setEditOpen(true)} style={{ paddingTop: 12 }}>
            <Text style={[type.button, { color: colors.lilac }]}>Add a phone number</Text>
          </Pressable>
        ) : null}
      </View>

      <View>
        <Eyebrow>Account</Eyebrow>
        <Pressable accessibilityRole="button" onPress={signOut} style={styles.accountRow}>
          <Text style={[type.body, { color: colors.textPrimary, fontSize: 17 }]}>Sign out</Text>
          <LogOut size={20} color={colors.textPrimary} strokeWidth={1.5} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setDeleteOpen(true)} style={[styles.accountRow, { borderBottomWidth: 0 }]}>
          <Text style={[type.body, { color: colors.errorOnDark, fontSize: 17 }]}>Delete account</Text>
          <Trash2 size={20} color={colors.errorOnDark} strokeWidth={1.5} />
        </Pressable>
      </View>

      {/* Remounts on each open, so it starts from the saved details. */}
      <EditDetailsSheet
        key={editOpen ? 'open' : 'closed'}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        firstName={p.first_name}
        phone={p.phone}
        onSave={(patch) => {
          setEditOpen(false);
          save(patch, 'Details updated.');
        }}
      />

      <Sheet
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Delete your account?"
        description="This permanently deletes your profile, answers, voice memos, photos and monthly notes. It can’t be undone.">
        <View style={{ gap: 10 }}>
          <SheetButton label="Keep my account" onPress={() => setDeleteOpen(false)} />
          <SheetButton label={deleting ? 'Deleting…' : 'Delete everything'} variant="destructive" onPress={remove} />
        </View>
      </Sheet>
    </Screen>
  );
}

function EditDetailsSheet({ open, onClose, firstName, phone, onSave }: {
  open: boolean;
  onClose: () => void;
  firstName: string;
  phone: string | null;
  onSave: (patch: ProfilePatch) => void;
}) {
  const [name, setName] = useState(firstName);
  const [tel, setTel] = useState(phone ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const cleanName = name.trim();
    const d = digits(tel);
    if (!cleanName) return setError('Add your name.');
    if (d && d.length !== 10) return setError('Add a 10-digit phone number.');
    // Removing the phone also turns off text updates (they need a number).
    onSave(d ? { first_name: cleanName, phone: d } : { first_name: cleanName, phone: null, text_consent: false });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Your details">
      <View style={{ gap: 14 }}>
        <View style={{ gap: 8 }}>
          <Text style={[type.label, { color: colors.burgundy600 }]}>First name</Text>
          <TextInput value={name} onChangeText={setName} autoCapitalize="words" maxLength={60} style={styles.lightInput} />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={[type.label, { color: colors.burgundy600 }]}>Phone · optional</Text>
          <TextInput
            value={tel}
            onChangeText={setTel}
            keyboardType="phone-pad"
            placeholder="(555) 555-0123"
            placeholderTextColor={colors.cream500}
            style={styles.lightInput}
          />
        </View>
        {error ? <Text style={[type.caption, { color: colors.error }]}>{error}</Text> : null}
        <SheetButton label="Save" onPress={submit} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(209,219,255,0.3)',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  lightInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.burgundy,
  },
});
