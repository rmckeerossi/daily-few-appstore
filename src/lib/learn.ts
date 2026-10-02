// Learn something: one fact or fiction, one tradition from around the world
// and one piece of weird history each day, on Home. Content from
// docs/learn-and-play-drafts.md. Fact or fiction needs the clinical advisor's
// review before launch; history items carry their source.

import { daysBetween, localDate } from './dates';

export type FactOrFiction = { statement: string; fact: boolean; truth: string; read: string | null };
export type Tradition = { name: string; place: string; about: string; tryIt: string };
export type HistoryItem = { title: string; story: string; source: string };

export const FACT_OR_FICTION: FactOrFiction[] = [
  { statement: 'A normal cycle is exactly 28 days.', fact: false, truth: 'Anywhere from about 21 to 35 days is typical for adults, and a few days’ difference from month to month is normal.', read: 'what-counts-as-a-regular-cycle' },
  { statement: 'You lose about a cup of blood during a period.', fact: false, truth: 'It’s usually closer to two or three tablespoons. If you’re soaking through a pad or tampon every hour or two, that’s worth mentioning to your doctor.', read: 'what-counts-as-a-regular-cycle' },
  { statement: 'Stress can make your period late.', fact: true, truth: 'The part of the brain that handles stress also helps run your cycle, so a hard month can delay ovulation, and your period with it.', read: 'stress-and-your-cycle' },
  { statement: 'Pre-period cravings are all in your head.', fact: false, truth: 'Cravings in the days before a period are common and real. Sleep, stress and shifting hormones all play a part.', read: 'whats-behind-a-craving' },
  { statement: 'PMOS (formerly PCOS) only affects women in larger bodies.', fact: false, truth: 'It affects women of every body size, and it’s often missed in women who don’t fit that picture.', read: 'how-pmos-is-diagnosed' },
  { statement: 'Perimenopause can start in your late 30s.', fact: true, truth: 'It most often begins in your 40s, but some people notice changes earlier, and it can last for several years.', read: 'what-is-perimenopause' },
  { statement: 'A bad night’s sleep can make you hungrier the next day.', fact: true, truth: 'Short sleep nudges up the hormone that drives hunger and turns down the one that helps you feel full.', read: 'sleep-and-mood' },
  { statement: 'Cortisol is a bad hormone.', fact: false, truth: 'You couldn’t get through a day without it. It follows a daily rhythm, and it’s when that rhythm gets thrown off that you feel it.', read: 'what-cortisol-actually-does' },
  { statement: 'Your gut helps your body get rid of used estrogen.', fact: true, truth: 'Your liver packages it up and much of it leaves through the gut, which is one reason regular digestion matters.', read: 'your-gut-and-hormones' },
  { statement: 'Irregular periods are just something you have to live with.', fact: false, truth: 'They often have a cause worth looking into, like thyroid changes, stress or PMOS (formerly PCOS). It’s worth raising with your doctor.', read: 'what-counts-as-a-regular-cycle' },
  { statement: 'Moving your body can ease period cramps for some people.', fact: true, truth: 'Gentle movement helps some people feel better. It isn’t a cure, and painful periods that stop you doing normal things are worth checking.', read: 'the-week-before-your-period' },
  { statement: 'You can’t get pregnant on your period.', fact: false, truth: 'It’s less likely, but possible, especially with shorter cycles, because sperm can survive for up to five days.', read: 'your-fertile-window' },
];

export const AROUND_THE_WORLD: Tradition[] = [
  { name: 'Fika', place: 'Sweden', about: 'A real pause in the day for coffee or tea and something sweet, ideally with someone else. Not at your desk, and not rushed.', tryIt: 'Make a hot drink, sit down properly, and put your phone in another room for ten minutes.' },
  { name: 'Hygge', place: 'Denmark', about: 'The feeling of cosiness and comfort, often shared: low light, warm drinks, good company.', tryIt: 'Switch off the overhead light, turn on a lamp or a candle, and get under a blanket.' },
  { name: 'Shinrin-yoku', place: 'Japan', about: '“Forest bathing”: slow, quiet time among trees, noticing rather than exercising.', tryIt: 'Walk somewhere green for ten minutes, slowly, and notice five things you can hear.' },
  { name: 'Niksen', place: 'The Netherlands', about: 'The art of doing nothing on purpose. Not scrolling, not planning, just letting your mind wander.', tryIt: 'Sit by a window for five minutes and do absolutely nothing.' },
  { name: 'Lagom', place: 'Sweden', about: '“Just the right amount”: not too much, not too little.', tryIt: 'Pick one thing you usually overdo, and do just enough of it.' },
  { name: 'Friluftsliv', place: 'Norway', about: '“Open-air life”: time outdoors in all weather, as part of everyday life.', tryIt: 'Step outside for five minutes before bed and look up.' },
  { name: 'Kintsugi', place: 'Japan', about: 'Repairing broken pottery with gold, so the cracks become part of the beauty.', tryIt: 'Write down one thing you’ve come through that left you stronger.' },
  { name: 'Ubuntu', place: 'Southern Africa', about: '“I am because we are”: the idea that we become who we are through each other.', tryIt: 'Send one message thanking someone who shaped you.' },
  { name: 'Hammam', place: 'Morocco', about: 'A weekly ritual of warmth, steam and slow care, often shared with other women.', tryIt: 'Take a long, warm shower with no rushing, and moisturise slowly afterwards.' },
  { name: 'Riposo', place: 'Italy', about: 'A slower stretch of the day after lunch, when shops close and people rest.', tryIt: 'This weekend, lie down for fifteen minutes after lunch with no alarm and no screen.' },
  { name: 'Zuo yuezi', place: 'China', about: '“Sitting the month”: a time of rest and care for new mothers after birth, often with family stepping in to help.', tryIt: 'Offer, or ask for, one act of care.' },
  { name: 'Tea ceremony', place: 'Japan', about: 'Making and sharing tea slowly and with attention, so an ordinary act becomes a ritual.', tryIt: 'Make one cup of tea with your full attention, start to finish.' },
];

export const WEIRD_HISTORY: HistoryItem[] = [
  { title: 'The wandering womb', story: 'Ancient Greek medical writers believed the womb could wander around the body, causing everything from fainting to breathlessness. The word “hysteria” comes from the Greek for womb.', source: 'Hippocratic writings, around 400 BCE' },
  { title: 'Sour wine and withered crops', story: 'The Roman writer Pliny the Elder claimed a woman on her period could sour wine, dull mirrors and make crops wither.', source: 'Pliny the Elder, Natural History, 1st century CE' },
  { title: 'The first pregnancy test', story: 'Ancient Egyptians tested for pregnancy by having a woman urinate on barley and wheat seeds. If they sprouted, she was likely pregnant. In the 1960s, researchers tried it and found it often worked.', source: 'Berlin Medical Papyrus; Ghalioungui and colleagues, 1963' },
  { title: 'The rest cure', story: 'In the late 1800s, women with “nervous” symptoms were often prescribed weeks of total bed rest, with no reading, writing or visitors. Charlotte Perkins Gilman wrote The Yellow Wallpaper about her experience of it.', source: 'S. Weir Mitchell’s rest cure; Gilman, 1892' },
  { title: 'Hysteria stayed until 1980', story: '“Hysterical neurosis” only disappeared from the main American psychiatric manual in 1980.', source: 'DSM-III, American Psychiatric Association, 1980' },
  { title: 'Left out of drug trials', story: 'In 1977, US guidance recommended excluding women who could become pregnant from early drug trials. It wasn’t reversed until 1993, so many medicines were first studied mostly in men.', source: 'FDA guidance 1977, reversed 1993; NIH Revitalization Act, 1993' },
  { title: 'Pads began as bandages', story: 'During the First World War, nurses noticed that wood-pulp bandages made for soldiers worked well as period pads. One of the first disposable pads went on sale shortly after.', source: 'Kotex, launched 1920' },
  { title: 'PMS got its name in 1953', story: 'Doctors Katharina Dalton and Raymond Greene coined “premenstrual syndrome” in 1953, giving a name to something women had described for centuries.', source: 'Greene and Dalton, British Medical Journal, 1953' },
  { title: 'Menopause, sold as a disease', story: 'A 1966 bestseller called Feminine Forever described menopause as a deficiency to be cured, shaping how a generation saw a natural stage of life.', source: 'Robert A. Wilson, Feminine Forever, 1966' },
  { title: 'The pill arrived in 1960', story: 'The first birth control pill was approved in the US in 1960. Within a few years, millions of women were taking it.', source: 'FDA approval of Enovid, 1960' },
  { title: 'Before PMS had a name', story: 'An American gynaecologist described the tension some women feel before their period in 1931, more than twenty years before “PMS” was coined.', source: 'Robert T. Frank, 1931' },
  { title: 'Blamed on the womb', story: 'For centuries, doctors linked headaches, sadness, fatigue and even sneezing to the womb, which is part of why women’s symptoms were so often brushed aside.', source: 'Medical texts from ancient Greece to the 19th century' },
];

/** Today's three, rotating daily, offset so the same three don't always appear together. */
export function todaysLearning(today = localDate()) {
  const n = Math.max(0, daysBetween('2026-01-01', today));
  return {
    fact: FACT_OR_FICTION[n % FACT_OR_FICTION.length],
    tradition: AROUND_THE_WORLD[(n + 4) % AROUND_THE_WORLD.length],
    history: WEIRD_HISTORY[(n + 8) % WEIRD_HISTORY.length],
  };
}

// Today's fact or fiction answer, so it stays revealed when she comes back.
const answerKey = (day: string) => `learn-fact:${day}`;

export function todaysGuess(day: string): boolean | null {
  try {
    const v = localStorage.getItem(answerKey(day));
    return v === 'fact' ? true : v === 'fiction' ? false : null;
  } catch {
    return null;
  }
}

export function saveGuess(day: string, fact: boolean) {
  try {
    localStorage.setItem(answerKey(day), fact ? 'fact' : 'fiction');
  } catch {}
}
