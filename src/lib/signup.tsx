import { createContext, use, useMemo, useState, type ReactNode } from 'react';

// What the three signup steps collect before the account exists (PRD Flow A).
// Nothing leaves the phone until step 3 passes the 18+ check.
export type SignupDraft = {
  firstName: string;
  seasonId: string | null;
  email: string;
  birthday: Date | null;
  phone: string;
  emailConsent: boolean;
  textConsent: boolean;
};

const empty: SignupDraft = {
  firstName: '',
  seasonId: null,
  email: '',
  birthday: null,
  phone: '',
  emailConsent: false,
  textConsent: false,
};

type SignupState = {
  draft: SignupDraft;
  update: (patch: Partial<SignupDraft>) => void;
  reset: () => void;
};

const SignupContext = createContext<SignupState | null>(null);

export function useSignup(): SignupState {
  const value = use(SignupContext);
  if (!value) throw new Error('useSignup must be used inside <SignupProvider>');
  return value;
}

export function SignupProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<SignupDraft>(empty);
  const value = useMemo(
    () => ({
      draft,
      update: (patch: Partial<SignupDraft>) => setDraft((d) => ({ ...d, ...patch })),
      reset: () => setDraft(empty),
    }),
    [draft],
  );
  return <SignupContext value={value}>{children}</SignupContext>;
}
