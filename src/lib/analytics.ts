// Pure analytics over the study data already in the DB (cards + SRS state, exam
// results). No new tables — this reads what review/quiz already record.

export type CardStat = {
  topic_slug: string | null;
  reps: number;
  lapses: number;
  ease: number;
  due_at: string;
};
export type TopicRef = { slug: string; title: string };

export type TopicMastery = {
  slug: string;
  title: string;
  cards: number;
  reviewed: number;
  mastered: number;
  lapses: number;
  avgEase: number | null;
  dueNow: number;
  masteryPct: number; // mastered / cards
  status: "weak" | "learning" | "solid" | "unstudied";
};

// Per-topic mastery from the flashcard SRS state. "mastered" = a card answered
// well at least twice in a row (reps ≥ 2); low ease or low mastery = struggling.
export function topicMastery(
  cards: CardStat[],
  topics: TopicRef[],
  now: Date = new Date()
): TopicMastery[] {
  const nowIso = now.toISOString();
  return topics
    .map((t) => {
      const cs = cards.filter((c) => c.topic_slug === t.slug);
      const reviewed = cs.filter((c) => c.reps > 0 || c.lapses > 0);
      const mastered = cs.filter((c) => c.reps >= 2).length;
      const lapses = cs.reduce((n, c) => n + c.lapses, 0);
      const dueNow = cs.filter((c) => c.due_at <= nowIso).length;
      const avgEase = reviewed.length
        ? reviewed.reduce((s, c) => s + c.ease, 0) / reviewed.length
        : null;
      const masteryPct = cs.length ? mastered / cs.length : 0;

      let status: TopicMastery["status"];
      if (!reviewed.length) status = "unstudied";
      else if (masteryPct < 0.4 || (avgEase !== null && avgEase < 2.1))
        status = "weak";
      else if (masteryPct < 0.8) status = "learning";
      else status = "solid";

      return {
        slug: t.slug,
        title: t.title,
        cards: cs.length,
        reviewed: reviewed.length,
        mastered,
        lapses,
        avgEase,
        dueNow,
        masteryPct,
        status,
      };
    })
    .filter((r) => r.cards > 0);
}

const STATUS_RANK = { weak: 0, learning: 1, unstudied: 2, solid: 3 } as const;

// Weakest / most-in-need first: struggling topics, then in-progress, then
// untouched, then solid. Ties broken by lower mastery, then more lapses.
export function rankByWeakness(rows: TopicMastery[]): TopicMastery[] {
  return [...rows].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      a.masteryPct - b.masteryPct ||
      b.lapses - a.lapses
  );
}

export type ExamPoint = { pct: number; score: number; total: number; at: string };

// Exam accuracy over time (oldest → newest), plus latest and best.
export function examTrend(
  results: { score: number; total: number; taken_at: string }[]
): { pts: ExamPoint[]; latest: ExamPoint | null; best: number; count: number } {
  const pts = [...results]
    .sort((a, b) => a.taken_at.localeCompare(b.taken_at))
    .map((r) => ({
      pct: r.total ? r.score / r.total : 0,
      score: r.score,
      total: r.total,
      at: r.taken_at,
    }));
  const best = pts.reduce((m, p) => (p.pct > m ? p.pct : m), 0);
  return { pts, latest: pts.at(-1) ?? null, best, count: pts.length };
}
