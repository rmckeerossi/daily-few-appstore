import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { deleteAnswer, getAnswer, type AnswerRow } from '@/lib/data';
import { monthName, parseLocalDate } from '@/lib/dates';
import { signedUrls } from '@/lib/media';
import { colors, fonts, type } from '@/theme/tokens';

import { Sheet, SheetButton } from './sheet';
import { useToast } from './toast';
import { VoicePill } from './voice';

/**
 * One answer, as written: date · deck, the question as worded when answered,
 * the writing, voice memo and photos. Edit or delete (with a confirm step).
 * `answerId` null keeps the sheet closed.
 */
export function AnswerSheet({ answerId, onClose, onDeleted }: {
  answerId: string | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [answer, setAnswer] = useState<AnswerRow | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!answerId) return;
    let active = true;
    getAnswer(answerId).then(async (a) => {
      if (!active || !a) return;
      const media = [...a.photo_paths, ...(a.voice_path ? [a.voice_path] : [])];
      const signed = await signedUrls(media);
      if (!active) return;
      setAnswer(a);
      setUrls(signed);
    });
    return () => {
      active = false;
      setAnswer(null);
      setConfirming(false);
    };
  }, [answerId]);

  const close = () => {
    setConfirming(false);
    onClose();
  };

  const remove = async () => {
    if (!answer) return;
    setDeleting(true);
    try {
      await deleteAnswer(answer);
      toast('Answer deleted.');
      onDeleted();
      close();
    } catch {
      toast('That didn’t delete. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  const edit = () => {
    if (!answer) return;
    close();
    router.push({ pathname: '/answer', params: { answer: answer.id } });
  };

  if (confirming) {
    return (
      <Sheet
        open={!!answerId}
        onClose={() => setConfirming(false)}
        title="Delete this answer?"
        description="It’s removed from your history and recap. This can’t be undone.">
        <View style={{ gap: 10 }}>
          <SheetButton label="Keep it" onPress={() => setConfirming(false)} />
          <SheetButton label={deleting ? 'Deleting…' : 'Delete'} variant="destructive" onPress={remove} />
        </View>
      </Sheet>
    );
  }

  const date = answer ? parseLocalDate(answer.answered_on) : null;

  return (
    <Sheet
      open={!!answerId}
      onClose={close}
      title={answer ? `${monthName(date!).slice(0, 3)} ${date!.getDate()} · ${answer.deck_name}` : ' '}>
      {!answer ? (
        <ActivityIndicator color={colors.burgundy} style={{ paddingVertical: 32 }} />
      ) : (
        <View style={{ gap: 16 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 31, color: colors.burgundy }}>
            {answer.question_text}
          </Text>
          {answer.reflected && !answer.body && !answer.voice_path && answer.photo_paths.length === 0 ? (
            <Text style={[type.body, { color: colors.burgundy600 }]}>Marked as reflected.</Text>
          ) : null}
          {answer.body ? <Text style={[type.bodyLg, { color: colors.burgundy }]}>{answer.body}</Text> : null}
          {answer.voice_path && urls[answer.voice_path] ? (
            <VoicePill uri={urls[answer.voice_path]} seconds={answer.voice_seconds ?? 0} />
          ) : null}
          {answer.photo_paths.length ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {answer.photo_paths.map((p) => (
                <Image
                  key={p}
                  source={{ uri: urls[p] }}
                  style={{ width: 84, height: 84, borderRadius: 12, backgroundColor: colors.cream300 }}
                  contentFit="cover"
                  accessibilityLabel="Photo"
                />
              ))}
            </View>
          ) : null}
          <View style={{ gap: 10, marginTop: 6 }}>
            <SheetButton label="Edit" onPress={edit} />
            <SheetButton label="Delete" variant="secondary" onPress={() => setConfirming(true)} />
          </View>
        </View>
      )}
    </Sheet>
  );
}
