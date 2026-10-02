import { router } from 'expo-router';
import { BookOpen, Droplet, Lock, Mic, Image as ImageIcon, PenLine, Balloon, CalendarDays } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { DiscoveryCard } from '@/components/discovery-card';
import { Chip } from '@/components/form';
import { CardGradient, NightBackground } from '@/components/gradients';
import { useToast } from '@/components/toast';
import { updateProfile } from '@/lib/data';
import { timeZone } from '@/lib/dates';
import { markIntroSeen } from '@/lib/intro';
import {
  askForNotifications,
  DEFAULT_REMINDER_TIME,
  markRemindersOffered,
  REMINDER_TIMES,
  syncReminders,
} from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, type } from '@/theme/tokens';

const PAGES = 4;

/**
 * A short, skippable intro, shown once a few seconds after someone lands on
 * their first card, and any time from Profile ("Show me around again").
 * Each page shows a small, real piece of the app rather than generic art.
 */
export default function Intro() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile, refreshProfile } = useSession();
  const toast = useToast();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [time, setTime] = useState(profile?.reminder_time?.slice(0, 5) ?? DEFAULT_REMINDER_TIME);
  const [saving, setSaving] = useState(false);

  // However they leave (done, skip or swiping the sheet down), don't show it again.
  useEffect(() => {
    if (profile) markIntroSeen(profile.id);
  }, [profile]);

  const goTo = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const remindMe = async () => {
    if (!profile) return close();
    setSaving(true);
    markRemindersOffered();
    try {
      if (await askForNotifications()) {
        await updateProfile(profile.id, { reminder_enabled: true, reminder_time: time, timezone: timeZone() });
        await refreshProfile();
        syncReminders({ ...profile, reminder_enabled: true, reminder_time: time }).catch(() => {});
        toast(`Reminder set for ${REMINDER_TIMES.find((t) => t.value === time)?.label ?? time}.`);
      } else {
        toast('You can turn reminders on any time in Profile.');
      }
    } catch {
      toast('That didn’t save. You can set it in Profile.');
    } finally {
      setSaving(false);
      close();
    }
  };

  const notNow = () => {
    markRemindersOffered();
    close();
  };

  return (
    <View style={{ flex: 1 }}>
      <NightBackground />
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View style={styles.dots} accessibilityLabel={`Step ${page + 1} of ${PAGES}`}>
          {Array.from({ length: PAGES }, (_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
        {page < PAGES - 1 ? <TextButton label="Skip" onPress={notNow} /> : <View style={{ width: 40 }} />}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
        <Page width={width} title="A few honest questions a day" body="Start with the card of the day, or pick a deck for whatever season you’re in. Answer in words, a voice memo or a photo.">
          <View style={styles.miniCard}>
            <CardGradient />
            <Text style={[type.labelSm, { color: 'rgba(254,252,242,0.8)', letterSpacing: 1.4 }]}>CARD OF THE DAY</Text>
            <Text style={styles.miniQuestion}>What’s something small that made this week better?</Text>
          </View>
          <View style={styles.row}>
            <Pill icon={PenLine} label="Write" />
            <Pill icon={Mic} label="Voice" />
            <Pill icon={ImageIcon} label="Photos" />
          </View>
          <View style={styles.row}>
            <Lock size={14} color={colors.textTertiary} strokeWidth={1.5} />
            <Text style={[type.bodySm, { color: colors.textTertiary }]}>Only you ever see your answers.</Text>
          </View>
        </Page>

        <Page width={width} title="Check in with your body" body="Ten seconds a day: tap how your energy, mood, sleep, stress and cravings feel, and note anything else.">
          <View style={styles.panel}>
            <MiniRow label="Energy" word="Good" filled={4} />
            <MiniRow label="Sleep" word="Okay" filled={3} />
            <View style={[styles.row, { marginTop: 4 }]}>
              <View style={[styles.chip, styles.chipOn]}>
                <Balloon size={14} color={colors.burgundy} strokeWidth={1.6} />
                <Text style={[type.bodySm, { color: colors.burgundy }]}>Bloating</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: colors.red, borderColor: colors.red }]}>
                <Droplet size={14} color={colors.paleCream} strokeWidth={1.6} />
                <Text style={[type.bodySm, { color: colors.paleCream }]}>Period today</Text>
              </View>
            </View>
          </View>
          <View style={styles.row}>
            <Lock size={14} color={colors.textTertiary} strokeWidth={1.5} />
            <Text style={[type.bodySm, { color: colors.textTertiary }]}>Your period days never leave your phone.</Text>
          </View>
        </Page>

        <Page width={width} title="Watch the patterns appear" body="Each Sunday, a look back at your week. Over time you’ll find what helps you, and short reads explain why.">
          <DiscoveryCard
            discovery={{
              key: 'intro-example',
              topic: 'helps',
              text: 'Your best-energy days come after a well-rested night.',
              evidence: 'An example of a discovery',
              read: null,
            }}
            isNew
          />
          <View style={styles.row}>
            <Pill icon={CalendarDays} label="Sunday digest" />
            <Pill icon={BookOpen} label="Two-minute reads" />
          </View>
        </Page>

        <Page width={width} title="When should we nudge you?" body="A gentle daily reminder that today’s card is waiting. No streaks, nothing to keep up.">
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {REMINDER_TIMES.map((t) => (
              <Chip key={t.value} label={t.label} selected={time === t.value} onPress={() => setTime(t.value)} />
            ))}
          </View>
          <Text style={[type.bodySm, { color: colors.textTertiary }]}>You can change this any time in Profile.</Text>
        </Page>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        {page < PAGES - 1 ? (
          <PrimaryButton label="Next" onPress={() => goTo(page + 1)} />
        ) : (
          <>
            <PrimaryButton label="Remind me" onPress={remindMe} loading={saving} />
            <View style={{ alignItems: 'center' }}>
              <TextButton label="Not now" onPress={notNow} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function Page({ width, title, body, children }: { width: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 12 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[type.bodyLg, { color: colors.textSecondary }]}>{body}</Text>
      </View>
      <View style={{ gap: 16 }}>{children}</View>
    </ScrollView>
  );
}

function Pill({ icon: Icon, label }: { icon: typeof PenLine; label: string }) {
  return (
    <View style={styles.chip}>
      <Icon size={14} color={colors.lilac} strokeWidth={1.6} />
      <Text style={[type.bodySm, { color: colors.textPrimary }]}>{label}</Text>
    </View>
  );
}

function MiniRow({ label, word, filled }: { label: string; word: string; filled: number }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[type.body, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[type.bodySm, { color: colors.lilac }]}>{word}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <View key={n} style={[styles.miniDot, n <= filled && styles.miniDotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(254,252,242,0.24)' },
  dotOn: { width: 22, backgroundColor: colors.lilac },
  page: { paddingHorizontal: 24, paddingTop: 36, paddingBottom: 24, gap: 28 },
  title: { fontFamily: fonts.displayLight, fontSize: 40, lineHeight: 42, color: colors.textPrimary },
  miniCard: { height: 190, borderRadius: radius.questionCard, overflow: 'hidden', padding: 22, justifyContent: 'space-between' },
  miniQuestion: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.paleCream },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(254,252,242,0.24)',
  },
  chipOn: { backgroundColor: colors.lilac, borderColor: colors.lilac },
  panel: {
    gap: 16,
    padding: 18,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  miniDot: { flex: 1, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(254,252,242,0.24)' },
  miniDotOn: { backgroundColor: colors.lilac, borderColor: colors.lilac },
  bottom: { paddingHorizontal: 24, gap: 10 },
});
