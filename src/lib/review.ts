// App Review can't receive emailed codes, so this one demo account signs in
// with a password instead (details go in App Store Connect's review notes).
// Every other account only ever signs in with a code.
export const REVIEW_EMAIL = 'appreview@dailyfew.com';

export const isReviewEmail = (email: string) => email.trim().toLowerCase() === REVIEW_EMAIL;
