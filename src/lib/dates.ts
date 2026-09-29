// Everything date-related runs on the phone, in the person's own timezone:
// "today", the month an answer belongs to, and when the card of the day rolls over.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-09-29" for the local calendar day. */
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-09-01": the first day of the local month. */
export function localMonthStart(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

/** Parses "YYYY-MM-DD" as a local calendar date (not UTC midnight). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function monthName(d: Date): string {
  return MONTHS[d.getMonth()];
}

/** "Tuesday · Sep 29" */
export function dayLabel(d = new Date()): string {
  return `${WEEKDAYS[d.getDay()]} · ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

/** "Sep 24" */
export function shortDate(s: string): string {
  const d = parseLocalDate(s);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function greetingFor(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Whole years between a "YYYY-MM-DD" birthday and today, locally. */
export function ageOn(birthday: Date, today = new Date()): number {
  let age = today.getFullYear() - birthday.getFullYear();
  const beforeBirthday =
    today.getMonth() < birthday.getMonth() ||
    (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function timeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}
