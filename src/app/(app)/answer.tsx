import { useLocalSearchParams } from 'expo-router';
import { Lock, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { KeyboardDone } from '@/components/keyboard-done';
import { PrimaryButton, RoundIconButton } from '@/components/buttons';
import { PhotoGrid, type PhotoSlot } from '@/components/photo-grid';
import { QuestionPanel } from '@/components/question-card';
import { Screen } from '@/components/screen';
import { Sheet, SheetButton } from '@/components/sheet';
import { LoadError, Loading } from '@/components/status';
import { BodySm, Caption, Eyebrow } from '@/components/text';
import { useToast } from '@/components/toast';
import { VoiceRecorder, type Recording } from '@/components/voice';
import { goBack } from '@/lib/nav';
import { noteAnswerSaved } from '@/lib/answer-events';
import { getAnswer, getCard, logActivity, saveAnswer, updateAnswer } from '@/lib/data';
import { monthName } from '@/lib/dates';
import { pickPhotos, removeMedia, signedUrls, uploadPhoto, uploadVoice, type PickedPhoto } from '@/lib/media';
import { offerNotificationsOnce, syncReminders } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { colors, fonts } from '@/theme/tokens';

const MAX_PHOTOS = 3;

type Slot = PhotoSlot & ({ kept: string } | { picked: PickedPhoto });
type Voice = Recording & { keptPath?: string };
type Question = { cardId: string; deckId: string | null; question: string; label: string };

/**
 * Answer a card (?card=) or edit an answer (?answer=): any mix of writing,
 * one voice memo up to 5 minutes, and up to 3 photos (PRD §4.3).
 */
export default function AnswerScreen() {
  const params = useLocalSearchParams<{ card?: string; answer?: string; cardOfDay?: string }>();
  const editing = !!params.answer;
  const { session, profile } = useSession();
  const toast = useToast();

  const [question, setQuestion] = useState<Question | null>(null);
  const [error, setError] = useState(false);
  const [body, setBody] = useState('');
  const [voice, setVoice] = useState<Voice | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [original, setOriginal] = useState<{ photos: string[]; voice: string | null }>({ photos: [], voice: null });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (params.answer) {
        const a = await getAnswer(params.answer);
        if (!a) throw new Error('not found');
        const media = [...a.photo_paths, ...(a.voice_path ? [a.voice_path] : [])];
        const urls = await signedUrls(media);
        // An edit always shows the wording as it was when first answered.
        setQuestion({ cardId: a.card_id, deckId: null, question: a.question_text, label: `${a.deck_name} · ${a.category_name}` });
        setBody(a.body ?? '');
        setSlots(a.photo_paths.map((p) => ({ key: p, uri: urls[p] ?? '', kept: p })));
        setVoice(a.voice_path ? { uri: urls[a.voice_path] ?? '', seconds: a.voice_seconds ?? 0, keptPath: a.voice_path } : null);
        setOriginal({ photos: a.photo_paths, voice: a.voice_path });
      } else if (params.card) {
        const c = await getCard(params.card);
        if (!c) throw new Error('not found');
        setQuestion({ cardId: c.id, deckId: c.deckId, question: c.question, label: `${c.deckName} · ${c.categoryName}` });
      }
    };
    load().catch(() => setError(true));
  }, [params.answer, params.card]);

  const hasContent = body.trim().length > 0 || slots.length > 0 || !!voice;

  const close = () => {
    if (dirty && hasContent) setDiscardOpen(true);
    else goBack();
  };

  const addPhotos = async () => {
    const picked = await pickPhotos(MAX_PHOTOS - slots.length);
    if (picked.length === 0) return;
    setDirty(true);
    setSlots((s) => [...s, ...picked.map((p, i) => ({ key: `${p.uri}-${Date.now()}-${i}`, uri: p.uri, picked: p }))]);
  };

  const save = async () => {
    if (!question || !hasContent || !session) return;
    setSaving(true);
    try {
      const uid = session.user.id;
      const photoPaths: string[] = [];
      for (const slot of slots) {
        photoPaths.push('kept' in slot ? slot.kept : await uploadPhoto(slot.picked, uid, 'answers'));
      }
      const voicePath = voice ? (voice.keptPath ?? (await uploadVoice(voice.uri, uid))) : null;
      const content = { body, photoPaths, voicePath, voiceSeconds: voice?.seconds ?? null };

      if (params.answer) {
        await updateAnswer(params.answer, content);
        // Clean up anything this edit removed or replaced.
        const dropped = [
          ...original.photos.filter((p) => !photoPaths.includes(p)),
          ...(original.voice && original.voice !== voicePath ? [original.voice] : []),
        ];
        await removeMedia(dropped);
        toast('Answer updated.');
      } else {
        await saveAnswer(question.cardId, content);
        const card = question.deckId ? { id: question.cardId, deckId: question.deckId } : null;
        logActivity('card_answered', card);
        if (params.cardOfDay) logActivity('card_of_day_answered', card);
        noteAnswerSaved(question.cardId);
        toast(`Saved to ${monthName(new Date())}.`);
        offerNotificationsOnce(() => syncReminders(profile).catch(() => {}));
      }
      goBack();
    } catch {
      setSaving(false);
      toast('That didn’t save. Everything is still here.');
    }
  };

  return (
    <Screen withTopBar keyboard gap={24}>
      <View style={styles.topBar}>
        <RoundIconButton icon={X} size={40} accessibilityLabel="Close" onPress={close} />
        <Eyebrow>{editing ? 'Edit answer' : 'New answer'}</Eyebrow>
        <KeyboardDone />
      </View>

      {error ? (
        <LoadError onRetry={() => goBack()} />
      ) : !question ? (
        <Loading />
      ) : (
        <>
          <QuestionPanel question={question.question} label={question.label} />

          <TextInput
            value={body}
            onChangeText={(t) => {
              setBody(t);
              setDirty(true);
            }}
            placeholder="Write as much or as little as you want."
            placeholderTextColor="rgba(254,252,242,0.45)"
            selectionColor={colors.lilac}
            keyboardAppearance="dark"
            multiline
            // Grows with the text, so a swipe down anywhere puts the keyboard away.
            scrollEnabled={false}
            autoFocus={!editing}
            textAlignVertical="top"
            accessibilityLabel="Your answer"
            style={styles.text}
          />

          <View style={{ gap: 12 }}>
            <Eyebrow>Voice memo · up to 5 min</Eyebrow>
            <VoiceRecorder
              recording={voice}
              onChange={(next) => {
                setDirty(true);
                setVoice(next);
              }}
            />
          </View>

          <View style={{ gap: 12 }}>
            <Eyebrow>
              Photos · {slots.length} of {MAX_PHOTOS}
            </Eyebrow>
            <PhotoGrid
              photos={slots}
              max={MAX_PHOTOS}
              onAdd={addPhotos}
              onRemove={(key) => {
                setDirty(true);
                setSlots((s) => s.filter((slot) => slot.key !== key));
              }}
            />
          </View>

          <View style={{ gap: 12 }}>
            <PrimaryButton label="Save answer" onPress={save} disabled={!hasContent} loading={saving} />
            {!hasContent ? (
              <BodySm style={{ textAlign: 'center' }}>Add some words, a voice memo or a photo to save.</BodySm>
            ) : (
              <View style={styles.privacy}>
                <Lock size={14} color={colors.textTertiary} strokeWidth={1.5} />
                <Caption>Only you can see this.</Caption>
              </View>
            )}
          </View>
        </>
      )}

      <Sheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Discard this answer?"
        description="What you’ve added here won’t be saved.">
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
    minHeight: 170,
    fontFamily: fonts.sansLight,
    fontSize: 18,
    lineHeight: 29,
    color: colors.textPrimary,
  },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
