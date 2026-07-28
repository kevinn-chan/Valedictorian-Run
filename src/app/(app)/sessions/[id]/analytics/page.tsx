import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { topicMastery, rankByWeakness, examTrend, UNGROUPED_SLUG } from "@/lib/analytics";

const STATUS = {
  weak: { label: "Needs work", cls: "bg-red-500/15 text-red-700", bar: "bg-red-500" },
  learning: { label: "Learning", cls: "bg-amber-500/15 text-amber-700", bar: "bg-amber-500" },
  solid: { label: "Solid", cls: "bg-green-500/15 text-green-700", bar: "bg-green-500" },
  unstudied: { label: "Not started", cls: "bg-secondary text-muted-foreground", bar: "bg-muted-foreground/40" },
} as const;

function Sparkline({ pts }: { pts: { pct: number }[] }) {
  const w = 260, h = 64, pad = 6;
  const xs = pts.map((_, i) =>
    pts.length > 1 ? pad + (i * (w - 2 * pad)) / (pts.length - 1) : w / 2
  );
  const ys = pts.map((p) => h - pad - p.pct * (h - 2 * pad));
  const line = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full max-w-[260px]" preserveAspectRatio="none">
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="2.5" className="fill-primary" />
      ))}
    </svg>
  );
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: session }, { data: cards }, { data: topics }, { data: exams }] =
    await Promise.all([
      supabase.from("sessions").select("id, title").eq("id", id).single(),
      supabase
        .from("cards")
        .select("topic_slug, reps, lapses, ease, due_at")
        .eq("session_id", id),
      supabase
        .from("wiki_pages")
        .select("slug, title")
        .eq("session_id", id)
        .eq("kind", "topic")
        .order("title"),
      supabase
        .from("exam_results")
        .select("score, total, taken_at")
        .eq("session_id", id)
        .order("taken_at"),
    ]);
  if (!session) notFound();

  const rows = rankByWeakness(topicMastery(cards ?? [], topics ?? []));
  const trend = examTrend(exams ?? []);
  const totalCards = cards?.length ?? 0;
  const mastered = rows.reduce((n, r) => n + r.mastered, 0);
  const dueTotal = rows.reduce((n, r) => n + r.dueNow, 0);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href={`/sessions/${id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {session.title}
      </Link>
      <h1 className="mt-1 page-title">Progress</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Where you&apos;re strong, where to focus next — from your reviews and mock exams.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-card p-4 ring-1 ring-border">
          <div className="text-3xl font-bold tracking-tight">{totalCards}</div>
          <div className="mt-1 text-xs text-muted-foreground">Cards</div>
        </div>
        <div className="rounded-xl bg-green-500/10 p-4 ring-1 ring-green-200">
          <div className="text-3xl font-bold tracking-tight text-green-700">{mastered}</div>
          <div className="mt-1 text-xs text-green-700/70">Mastered</div>
        </div>
        <div className={`rounded-xl p-4 ring-1 ${dueTotal > 0 ? "bg-primary/10 ring-primary/20" : "bg-card ring-border"}`}>
          <div className={`text-3xl font-bold tracking-tight ${dueTotal > 0 ? "text-primary" : ""}`}>{dueTotal}</div>
          <div className={`mt-1 text-xs ${dueTotal > 0 ? "text-primary/70" : "text-muted-foreground"}`}>Due now</div>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-border">
          <div className="text-3xl font-bold tracking-tight">{trend.count}</div>
          <div className="mt-1 text-xs text-muted-foreground">Exams taken</div>
        </div>
      </div>

      <section className="mt-6 card-soft p-5">
        <h2 className="text-sm font-medium">Mock-exam accuracy</h2>
        {trend.count > 0 && trend.latest ? (
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div className="flex gap-6">
              <div>
                <div className="text-2xl font-semibold tracking-tight">
                  {Math.round(trend.latest.pct * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  latest · {trend.latest.score}/{trend.latest.total}
                </div>
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight text-green-600">
                  {Math.round(trend.best * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">best</div>
              </div>
            </div>
            {trend.count > 1 && <Sparkline pts={trend.pts} />}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No attempts yet.{" "}
            <Link href={`/sessions/${id}/quiz`} className="text-primary hover:underline">
              Take a mock exam
            </Link>{" "}
            to start tracking accuracy.
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium">Topics — weakest first</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No flashcards yet.{" "}
            <Link href={`/sessions/${id}`} className="text-primary hover:underline">
              Generate cards
            </Link>{" "}
            to see per-topic mastery.
          </p>
        ) : (
          <ul className="mt-4 space-y-1">
            {rows.map((r) => {
              const s = STATUS[r.status];
              const href = r.dueNow || r.slug === UNGROUPED_SLUG
                ? `/sessions/${id}/review`
                : `/sessions/${id}/wiki/${r.slug}`;
              return (
                <li key={r.slug} className="rounded-lg px-4 py-3 transition-colors hover:bg-secondary/40">
                  <div className="flex items-center gap-3">
                    <Link href={href} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary">
                      {r.title}
                    </Link>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
                        style={{ width: `${Math.round(r.masteryPct * 100)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {r.mastered}/{r.cards} mastered
                      {r.lapses > 0 && ` · ${r.lapses} lapse${r.lapses === 1 ? "" : "s"}`}
                      {r.dueNow > 0 && ` · ${r.dueNow} due`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
