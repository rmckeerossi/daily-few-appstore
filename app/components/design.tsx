import type { ReactNode, ButtonHTMLAttributes, ElementType, CSSProperties } from "react";
import { cn } from "~/lib/utils";

/* ── Daily Few design language. Always dark; centered phone column. ── */

const GRADIENT = {
  brand: "linear-gradient(160deg, #531832 0%, #8A365A 100%)",
  card: "radial-gradient(120% 70% at 50% 115%, rgba(209,219,255,.55), rgba(209,219,255,0) 62%), linear-gradient(160deg, #531832 0%, #8A365A 100%)",
  season: "radial-gradient(120% 90% at 20% 0%, rgba(209,219,255,.5), rgba(209,219,255,0) 60%), linear-gradient(160deg, #6B2743 0%, #3A1526 100%)",
  back1: "linear-gradient(160deg, #3A1526, #6B2743)",
  back2: "linear-gradient(160deg, #4C1C31, #6B2743)",
};
const artBg = (artStyle?: string) => (artStyle === "season" ? GRADIENT.season : GRADIENT.brand);

/* Deterministic pseudo-random star positions (no Math.random in render). */
const STARS: { x: number; y: number; s: number; o: number }[] = (() => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: 46 }, () => ({
    x: Math.round(rnd() * 1000) / 10,
    y: Math.round(rnd() * 1000) / 10,
    s: rnd() > 0.65 ? 2 : 1,
    o: Math.round((0.18 + rnd() * 0.5) * 100) / 100,
  }));
})();

export function StarField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {STARS.map((st, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[var(--df-cream)]"
          style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, opacity: st.o }}
        />
      ))}
    </div>
  );
}

export function PhoneShell({ children, nav }: { children: ReactNode; nav?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="relative mx-auto min-h-screen max-w-[430px] overflow-x-clip">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[180%] -translate-x-1/2"
          style={{ background: "radial-gradient(closest-side at 50% -10%, rgba(138,54,90,.45), transparent)" }}
        />
        <StarField />
        <div className="relative px-[22px] pt-16 pb-[124px]">{children}</div>
        {nav}
      </div>
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[10.5px] font-medium uppercase leading-[1.2] tracking-[.16em] text-[var(--df-text-label)]", className)}>
      {children}
    </p>
  );
}

export function DisplayTitle({ children, as, className }: { children: ReactNode; as?: ElementType; className?: string }) {
  const Tag = (as ?? "h1") as ElementType;
  return (
    <Tag className={cn("font-display text-[38px] leading-[1.06] tracking-[-0.01em] text-foreground", className)} style={{ fontWeight: "var(--font-weight-display)" } as CSSProperties}>
      {children}
    </Tag>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { size?: "lg" | "md"; children: ReactNode };
const btnBase =
  "inline-flex w-full items-center justify-center gap-2 rounded-full font-sans font-medium uppercase tracking-[.04em] leading-none transition-[background-color,color,transform] duration-normal ease-standard active:translate-y-px disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring";
const btnSize = (size?: "lg" | "md") => (size === "lg" ? "h-14 px-7 text-[14px]" : "h-12 px-6 text-[12px]");

export function PrimaryButton({ size, className, children, ...rest }: BtnProps) {
  return (
    <button className={cn(btnBase, btnSize(size), "bg-primary text-primary-foreground hover:bg-primary-hover", className)} {...rest}>
      {children}
    </button>
  );
}

export function OutlineButton({ size, className, children, ...rest }: BtnProps) {
  return (
    <button
      className={cn(btnBase, btnSize(size), "border border-[rgba(254,252,242,.40)] bg-transparent text-foreground hover:bg-primary hover:text-primary-foreground", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function RoundIconButton({ icon, label, size, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: ReactNode; label?: ReactNode; size?: number }) {
  const d = size ?? 54;
  return (
    <button className={cn("group flex flex-col items-center gap-2 bg-transparent text-foreground", className)} {...rest}>
      <span
        className="flex items-center justify-center rounded-full border border-[var(--df-outline-border)] transition-colors duration-normal ease-standard group-hover:bg-surface-hover group-active:translate-y-px"
        style={{ width: d, height: d }}
      >
        {icon}
      </span>
      {label != null && <span className="font-mono text-[10px] uppercase tracking-[.16em] text-[var(--df-text-label)]">{label}</span>}
    </button>
  );
}

export function QuestionCard({ question, deckLabel, categoryLabel, height, className }: { question: ReactNode; deckLabel: ReactNode; categoryLabel: ReactNode; height?: number; className?: string }) {
  return (
    <div
      className={cn("flex flex-col justify-between rounded-[24px] border border-[rgba(209,219,255,.32)] p-[26px] text-foreground", className)}
      style={{ background: GRADIENT.card, boxShadow: "var(--df-shadow-question)", minHeight: height ?? 420 }}
    >
      <img src="/assets/submark-white.png" alt="" width={26} height={26} className="h-[26px] w-[26px]" />
      <p className="font-display text-[32px] leading-[1.12] tracking-[-0.01em] [text-wrap:balance]" style={{ fontWeight: "var(--font-weight-display)" } as CSSProperties}>
        {question}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[rgba(254,252,242,.80)]">
        {deckLabel} · {categoryLabel}
      </p>
    </div>
  );
}

function CardStack({ artStyle }: { artStyle?: string }) {
  return (
    <div className="relative h-[86px] w-[62px] shrink-0">
      <span className="absolute inset-0 -rotate-[8deg] rounded-[10px]" style={{ background: GRADIENT.back1 }} />
      <span className="absolute inset-0 rounded-[10px]" style={{ background: artBg(artStyle) }} />
    </div>
  );
}

export function DeckRowCard({ name, description, meta, artStyle, className }: { name: ReactNode; description?: ReactNode; meta?: ReactNode; artStyle?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-[18px] rounded-[20px] border border-[var(--df-surface-border)] bg-[var(--df-surface)] p-4 transition-colors duration-normal hover:bg-surface-hover", className)}>
      <CardStack artStyle={artStyle} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-[25px] leading-[1.1] text-foreground" style={{ fontWeight: "var(--font-weight-display)" } as CSSProperties}>{name}</p>
        {description && <p className="mt-1 text-[13px] leading-[1.45] text-[var(--df-text-secondary)]">{description}</p>}
        {meta && <p className="mt-2 font-mono text-[10px] uppercase tracking-[.16em] text-[var(--df-lilac)]">{meta}</p>}
      </div>
    </div>
  );
}

export function DeckTile({ name, description, meta, badge, artStyle, artHeight, className }: { name: ReactNode; description?: ReactNode; meta?: ReactNode; badge?: ReactNode; artStyle?: string; artHeight?: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[22px] border border-[var(--df-surface-border)] bg-[var(--df-surface)]", className)}>
      <div className="relative flex items-end p-[18px]" style={{ background: artBg(artStyle), height: artHeight ?? 160 }}>
        {badge && (
          <span className="absolute left-[14px] top-[14px] rounded-full bg-primary px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[.16em] text-primary-foreground">{badge}</span>
        )}
        <p className="font-display text-[30px] leading-[1.1] text-foreground" style={{ fontWeight: "var(--font-weight-display)" } as CSSProperties}>{name}</p>
      </div>
      <div className="px-[18px] pb-[18px] pt-[14px]">
        {description && <p className="text-[13px] leading-[1.45] text-[var(--df-text-secondary)]">{description}</p>}
        {meta && <p className="mt-2 font-mono text-[10px] uppercase tracking-[.16em] text-[var(--df-lilac)]">{meta}</p>}
      </div>
    </div>
  );
}

export function SegmentedControl<T extends string>({ options, value, onChange, className }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("flex gap-1 rounded-full bg-[rgba(209,219,255,.10)] p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-[34px] flex-1 rounded-full font-mono text-[10.5px] font-medium uppercase tracking-[.16em] transition-colors duration-normal ease-standard",
            o.value === value ? "bg-primary text-primary-foreground" : "text-[var(--df-text-label)] hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type MonthRingDay = { reflected: boolean; past: boolean; today: boolean };
export function MonthRing({ monthLabel, centerBig, centerSub, days, className }: { monthLabel: ReactNode; centerBig: ReactNode; centerSub?: ReactNode; days: MonthRingDay[]; className?: string }) {
  const R = 128, C = 143;
  return (
    <div className={cn("relative mx-auto h-[286px] w-[286px]", className)}>
      {days.map((d, i) => {
        const a = (i / days.length) * 2 * Math.PI - Math.PI / 2;
        const size = d.today ? 16 : 9;
        const x = C + R * Math.cos(a) - size / 2;
        const y = C + R * Math.sin(a) - size / 2;
        const style: CSSProperties = { left: x, top: y, width: size, height: size };
        let cls = "absolute rounded-full";
        if (d.today) {
          cls += " border border-[var(--df-cream)]";
          style.boxShadow = "0 0 0 4px rgba(209,219,255,.18),0 0 18px rgba(209,219,255,.6)";
          if (d.reflected) style.background = "var(--df-lilac)";
        } else if (d.past && d.reflected) cls += " bg-[var(--df-lilac)]";
        else if (d.past) cls += " bg-[rgba(254,252,242,.16)]";
        else cls += " border border-[var(--df-outline-border)] bg-transparent";
        return <span key={i} className={cls} style={style} />;
      })}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="font-mono text-[10.5px] font-medium uppercase tracking-[.16em] text-[var(--df-lilac)]">{monthLabel}</p>
        <p className="mt-1 font-display text-[52px] leading-none text-foreground" style={{ fontWeight: "var(--font-weight-display)" } as CSSProperties}>{centerBig}</p>
        {centerSub && <p className="mt-1 max-w-[150px] text-[13px] leading-[1.45] text-[var(--df-text-secondary)]">{centerSub}</p>}
      </div>
    </div>
  );
}

export function Toast({ message, className }: { message: ReactNode; className?: string }) {
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-[58px] z-50 flex justify-center px-6">
      <div className={cn("rounded-full bg-primary px-5 py-2.5 font-sans text-[13px] font-medium text-primary-foreground", className)} style={{ boxShadow: "var(--df-shadow-toast)" }}>
        {message}
      </div>
    </div>
  );
}

export function SheetShell({ title, children, onClose, className }: { title?: ReactNode; children: ReactNode; onClose?: () => void; className?: string }) {
  return (
    <div className={cn("rounded-t-[28px] bg-[var(--df-pale-cream)] px-6 pb-10 pt-[14px] text-[var(--df-burgundy)]", className)}>
      <button type="button" aria-label="Close" onClick={onClose} className="mx-auto mb-4 block h-1 w-10 rounded-full bg-[var(--df-cream-300)]" />
      {title && <h2 className="mb-4 font-display text-[30px] leading-[1.1] text-[var(--df-burgundy)]" style={{ fontWeight: "var(--font-weight-display)" } as CSSProperties}>{title}</h2>}
      {children}
    </div>
  );
}

export function StatTile({ value, label, className }: { value: ReactNode; label: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-[rgba(40,14,26,.28)] px-4 py-[14px]", className)}>
      <p className="font-display text-[40px] leading-none text-foreground [font-variant-numeric:tabular-nums]" style={{ fontWeight: "var(--font-weight-display)" } as CSSProperties}>{value}</p>
      <p className="mt-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[.16em] text-[var(--df-text-label)]">{label}</p>
    </div>
  );
}

/* ── Standard platform vocabulary (page frame, headings, panels, badges, KPIs) ── */

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[430px] px-[22px] pt-16 pb-[124px]">{children}</div>;
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-col gap-3">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <div className="flex items-start justify-between gap-4">
        <DisplayTitle>{title}</DisplayTitle>
        {actions && <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div>}
      </div>
      {subtitle && <p className="text-[15px] leading-[1.6] text-[var(--df-text-secondary)]">{subtitle}</p>}
    </header>
  );
}

export function SectionHeading({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h3 className="font-display text-[23px] leading-[1.1] text-foreground" style={{ fontWeight: "var(--font-weight-display)" } as CSSProperties}>{title}</h3>
      {action && <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-muted-foreground transition-colors hover:text-foreground">{action}</div>}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-[20px] border border-[var(--df-surface-border)] bg-[var(--df-surface)]", className)}>{children}</div>;
}

export function PanelBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

const badgeTone = {
  neutral: "border-border-strong text-foreground-secondary",
  info: "border-[var(--df-lilac)] text-[var(--df-lilac)]",
  success: "border-success text-foreground",
  warning: "border-warning text-warning",
  danger: "border-error text-error",
} as const;

export function StatusBadge({ tone, children }: { tone: keyof typeof badgeTone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[.16em]", badgeTone[tone])}>{children}</span>
  );
}

export function EmptyState({ title, body, action }: { title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[20px] border border-dashed border-[var(--df-outline-border)] px-6 py-12 text-center">
      <p className="font-display text-[25px] leading-[1.1] text-foreground" style={{ fontWeight: "var(--font-weight-display)" } as CSSProperties}>{title}</p>
      {body && <p className="mt-2 max-w-[260px] text-[13px] leading-[1.45] text-[var(--df-text-secondary)]">{body}</p>}
      {action && <div className="mt-6 w-full">{action}</div>}
    </div>
  );
}

export function MetricStrip({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-[var(--df-surface-border)] bg-[var(--df-surface-border)]">{children}</div>;
}

export function Metric({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col bg-background px-4 py-[14px]">
      <p className="font-mono text-[10.5px] font-medium uppercase tracking-[.16em] text-[var(--df-text-label)]">{label}</p>
      <p className="mt-1 font-display text-[40px] leading-none text-foreground [font-variant-numeric:tabular-nums]" style={{ fontWeight: "var(--font-weight-display)" } as CSSProperties}>{value}</p>
      {hint && <p className="mt-1.5 text-[12px] leading-[1.4] text-muted-foreground">{hint}</p>}
    </div>
  );
}
