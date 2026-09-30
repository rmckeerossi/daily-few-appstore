import { useLocalSearchParams } from 'expo-router';
import { Lock, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { KeyboardDone } from '@/components/keyboard-done';
import { PrimaryButton, RoundIconButton, TextButton } from '@/components/buttons';
import { PhotoGrid, type PhotoSlot } from '@/components/photo-grid';
import { Screen } from '@/components/screen';
import { Sheet, SheetButton } from '@/components/sheet';
import { LoadError, Loading } from '@/components/status';
import { Caption, Eyebrow } from '@/components/text';
import { useToast } from '@/components/toast';
import { goBack } from '@/lib/nav';
import { createEntry, deleteEntry, getEntry, updateEntry, type EntryKind } from '@/lib/data';
import { monthName } from '@/lib/dates';
import { pickPhotos, removeMedia, signedUrls, uploadPhoto, type PickedPhoto } from '@/lib/media';
import { offerNotificationsOnce, syncReminders } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { colors, fonts, type } from '@/theme/tokens';

const MAX_PHOTOS = 3;

type Slot = PhotoSlot & ({ kept: string } | { picked: PickedPhoto });

const COPY: Record<EntryKind, { eyebrow: string; title: string; newLabel: string; editLabel: string; empty: string }> = {
  write: {
    eyebrow: 'Write about today',
    title: 'Today, in your words',
    newLabel: 'New entry',
    editLabel: 'Edit entry',
    empty: 'Write a few words to save this entry.',
  },
  moment: {
    eyebrow: 'Add a moment',
    title: 'A moment to keep',
    newLabel: 'New moment',
    editLabel: 'Edit moment',
    empty: 'Add at least one photo to save this moment.',
  },
};

/**
 * A card-less entry saved to this month, from the + menu (ported from the
 * Stencil version). "write": text required, up to 3 photos. "moment": 1–3
 * photos required, optional caption.
 */
export default function EntryScreen() {
  const params = useLocalSearchParams<{ kind?: EntryKind; id?: string }>();
  const { session, profile } = useSession();
  const toast = useToast();

  const [kind, setKind] = useState<EntryKind>(params.kind === 'moment' ? 'moment' : 'write');
  const [loaded, setLoaded] = useState(!params.id);
  const [loadFailed, setLoadFailed] = useState(false);
  const [body, setBody] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [originalPaths, setOriginalPaths] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const remove = async () => {
    if (!params.id) return;
    setDeleteOpen(false);
    try {
      await deleteEntry(params.id);
      await removeMedia(originalPaths);
      toast('Deleted.');
      goBack();
    } catch {
      toast('That didn’t delete. Try again.');
    }
  };

  // Editing an existing entry.
  useEffect(() => {
    if (!params.id) return;
    getEntry(params.id)
      .then(async (entry) => {
        if (!entry) {
          setLoadFailed(true);
          return;
        }
        const urls = await signedUrls(entry.photo_paths);
        setKind(entry.kind);
        setBody(entry.body ?? '');
        setOriginalPaths(entry.photo_paths);
        setSlots(entry.photo_paths.map((p) => ({ key: p, uri: urls[p] ?? '', kept: p })));
        setLoaded(true);
      })
      .catch(() => setLoadFailed(true));
  }, [params.id]);

  const copy = COPY[kind];
  const isMoment = kind === 'moment';
  const canSave = isMoment ? slots.length > 0 : body.trim().length > 0;

  const addPhotos = async () => {
    const picked = await pickPhotos(MAX_PHOTOS - slots.length);
    if (picked.length === 0) return;
    setDirty(true);
    setSlots((s) => [...s, ...picked.map((p, i) => ({ key: `${p.uri}-${Date.now()}-${i}`, uri: p.uri, picked: p }))]);
  };

  const removePhoto = (key: string) => {
    setDirty(true);
    setSlots((s) => s.filter((slot) => slot.key !== key));
  };

  const close = () => {
    if (dirty) setDiscardOpen(true);
    else goBack();
  };

  const save = async () => {
    if (!canSave || !session) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      const paths: string[] = [];
      for (const slot of slots) {
        paths.push('kept' in slot ? slot.kept : await uploadPhoto(slot.picked, session.user.id, 'entries'));
      }
      if (params.id) {
        await updateEntry(params.id, body, paths);
        await removeMedia(originalPaths.filter((p) => !paths.includes(p)));
        toast(isMoment ? 'Moment updated.' : 'Entry updated.');
      } else {
        await createEntry(kind, body, paths);
        toast(`Saved to ${monthName(new Date())}.`);
        offerNotificationsOnce(() => syncReminders(profile).catch(() => {}));
      }
      goBack();
    } catch {
      setSaving(false);
      setSaveFailed(true);
    }
  };

  const textField = (
    <TextInput
      value={body}
      onChangeText={(t) => {
        setBody(t);
        setDirty(true);
      }}
      placeholder={isMoment ? 'Add a short caption (optional).' : 'What was today like? Write as much or as little as you want.'}
      placeholderTextColor="rgba(254,252,242,0.45)"
      selectionColor={colors.lilac}
      keyboardAppearance="dark"
      multiline
      // Grows with the text, so a swipe down anywhere puts the keyboard away.
      scrollEnabled={false}
      autoFocus={!isMoment && !params.id}
      textAlignVertical="top"
      accessibilityLabel={isMoment ? 'Caption' : 'Your entry'}
      style={[styles.text, { minHeight: isMoment ? 96 : 200 }]}
    />
  );

  const photos = (
    <View style={{ gap: 12 }}>
      <Eyebrow>
        Photos · {slots.length} of {MAX_PHOTOS}
      </Eyebrow>
      <PhotoGrid photos={slots} max={MAX_PHOTOS} onAdd={addPhotos} onRemove={removePhoto} />
      <Caption>
        {isMoment ? 'One to three photos. Only you will see them.' : 'Optional. Up to three. Only you will see them.'}
      </Caption>
    </View>
  );

  return (
    <Screen withTopBar keyboard gap={28}>
      <View style={styles.topBar}>
        <RoundIconButton icon={X} size={40} accessibilityLabel="Close" onPress={close} />
        <Eyebrow>{params.id ? copy.editLabel : copy.newLabel}</Eyebrow>
        <KeyboardDone />
      </View>

      {loadFailed ? (
        <LoadError onRetry={() => goBack()} />
      ) : !loaded ? (
        <Loading />
      ) : (
        <>
          <View style={{ gap: 8 }}>
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <Text style={[type.greeting, { color: colors.textPrimary }]}>{copy.title}</Text>
          </View>

          {isMoment ? (
            <>
              {photos}
              {textField}
            </>
          ) : (
            <>
              {textField}
              {photos}
            </>
          )}

          <View style={{ gap: 12, alignItems: 'center' }}>
            <PrimaryButton
              label={saving ? 'Saving…' : 'Save to this month'}
              onPress={save}
              disabled={!canSave}
              loading={saving}
              style={{ alignSelf: 'stretch' }}
            />
            {saveFailed ? (
              <Text style={[type.bodySm, { color: colors.errorOnDark }]}>Couldn’t save. Everything is still here.</Text>
            ) : null}
            {!canSave ? (
              <Caption>{copy.empty}</Caption>
            ) : (
              <View style={styles.privacy}>
                <Lock size={14} color={colors.textTertiary} strokeWidth={1.5} />
                <Caption>Only you can see this.</Caption>
              </View>
            )}
            {params.id ? (
              <TextButton label={isMoment ? 'Delete this moment' : 'Delete this entry'} color={colors.errorOnDark} onPress={() => setDeleteOpen(true)} />
            ) : null}
          </View>
        </>
      )}

      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this?"
        description="This will be removed for good.">
        <View style={{ gap: 10 }}>
          <SheetButton label="Keep it" onPress={() => setDeleteOpen(false)} />
          <SheetButton label="Delete" variant="destructive" onPress={remove} />
        </View>
      </Sheet>

      <Sheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Discard this?"
        description="Your writing and photos won’t be saved.">
        <View style={{ gap: 10 }}>
          <SheetButton label="Keep going" onPress={() => setDiscardOpen(false)} />
          <SheetButton
            label="Discard"
            variant="destructive"
            onPress={() => {
              setDiscardOpen(false);
              goBack();
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: {
    fontFamily: fonts.sansLight,
    fontSize: 18,
    lineHeight: 29,
    color: colors.textPrimary,
  },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
