import Link from "next/link";

/* Shared vocabulary for every authenticated screen. One card shape, one tile,
   one header, one ring — so the app reads as a single surface rather than a
   dozen pages that happen to share a palette. */

/** Circular progress. Used for mastery — the one number worth a whole shape. */
export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  children,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(pct * 100)}% mastered`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.23,1,0.32,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/** Horizontal progress bar. The list-row counterpart to the ring. */
export function ProgressBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  // Clipped rather than width-animated: clip-path composites on the GPU and
  // keeps the rounded end cap that a scaleX would squash.
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-secondary ${className}`}>
      <div
        className="h-full w-full rounded-full bg-primary"
        style={{
          clipPath: `inset(0 ${(1 - pct) * 100}% 0 0 round 999px)`,
          transition: "clip-path 600ms cubic-bezier(0.23,1,0.32,1)",
        }}
      />
    </div>
  );
}

const TONE = {
  plain: "bg-card border-border",
  primary: "bg-primary/8 border-primary/20",
  positive: "bg-emerald-500/8 border-emerald-600/20",
} as const;

/** One number, one label. The whole dashboard stat vocabulary. */
export function StatTile({
  label,
  value,
  hint,
  tone = "plain",
  href,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: keyof typeof TONE;
  href?: string;
  icon?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  const cls = `rounded-2xl border p-5 ${TONE[tone]}`;
  return href ? (
    <Link href={href} className={`${cls} block card-lift`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Every inner page opens the same way: crumb, title, one line of orientation. */
export function PageHeader({
  back,
  backLabel,
  title,
  description,
  actions,
}: {
  back?: string;
  backLabel?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      {back && (
        <Link
          href={back}
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden>←</span>
          {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-[68ch] text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** A titled region. Replaces the ad-hoc `card-soft` wrappers page to page. */
export function Panel({
  title,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-card ${className}`}
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </div>
      )}
      <div className={bodyClassName || "p-5"}>{children}</div>
    </section>
  );
}
