"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { schedule, type Grade } from "@/lib/srs";

interface Card {
  id: string;
  front: string;
  back: string;
  topic_slug: string | null;
  source_ref: {
    page?: number;
    kind?: string;
    figureId?: string;
    rect?: { x: number; y: number; w: number; h: number };
  } | null;
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
  session_title?: string | null; // shown only in the cross-session "due today" queue
}

// "Good · 3d" style preview of where each grade sends the card
function intervalLabel(card: Card, g: Grade) {
  const next = schedule(card, g);
  return next.interval_days === 0 ? "10m" : `${next.interval_days}d`;
}

export function ReviewClient({
  sessionId,
  cards,
}: {
  sessionId?: string; // omitted in the cross-session "due today" queue
  cards: Card[];
}) {
  const [queue, setQueue] = useState(cards);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const card = queue[0];

  const grade = useCallback(
    async (g: "again" | "good" | "easy") => {
      if (!card || !flipped) return;
      setFlipped(false);
      setReviewed((n) => n + 1);
      // "again" puts the card back at the end of this session's queue
      setQueue((q) => (g === "again" ? [...q.slice(1), card] : q.slice(1)));
      fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, grade: g }),
      });
    },
    [card, flipped]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "1") grade("again");
      else if (e.key === "2") grade("good");
      else if (e.key === "3") grade("easy");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grade]);

  const total = reviewed + queue.length;

  if (!card) {
    return (
      <div className="mt-20 flex flex-col items-center text-center animate-slide-up">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle2 className="size-8 text-green-600" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">
          {reviewed ? `${reviewed} cards reviewed` : "Nothing due"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Come back when the next cards fall due.
        </p>
        <Link
          href={sessionId ? `/sessions/${sessionId}` : "/"}
          className="btn-squish mt-8 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          {sessionId ? "← Back to session" : "← Home"}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{reviewed} reviewed</span>
          <span>{queue.length} remaining</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${total > 0 ? (reviewed / total) * 100 : 0}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        space = flip · 1 again · 2 good · 3 easy
      </p>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="card-soft card-lift mt-4 w-full cursor-pointer p-10 text-left"
      >
        {card.session_title && (
          <p className="mb-3 text-xs font-medium text-primary/80">
            {card.session_title}
          </p>
        )}
        <p className="text-base leading-relaxed">{card.front}</p>

        {card.source_ref?.kind === "occlusion" &&
        card.source_ref.figureId &&
        card.source_ref.rect ? (
          // The masked region covers the label until you flip; then it turns into
          // a ring so you can check the answer against the revealed figure.
          <div className="relative mt-4 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/figure/${card.source_ref.figureId}`}
              alt="occlusion figure"
              className="max-h-[50vh] w-auto rounded-lg border"
            />
            <div
              className={`absolute rounded ${
                flipped ? "ring-2 ring-primary" : "bg-primary"
              }`}
              style={{
                left: `${card.source_ref.rect.x * 100}%`,
                top: `${card.source_ref.rect.y * 100}%`,
                width: `${card.source_ref.rect.w * 100}%`,
                height: `${card.source_ref.rect.h * 100}%`,
              }}
            />
          </div>
        ) : null}

        {flipped && (
          <div className="animate-in fade-in slide-in-from-bottom-2 mt-6 border-t pt-6 duration-300">
            <p className="text-sm leading-relaxed text-foreground/90">
              {card.back}
            </p>
            {card.source_ref?.page && (
              <p className="mt-3 text-xs text-muted-foreground">
                p. {card.source_ref.page}
              </p>
            )}
          </div>
        )}
      </button>

      {flipped ? (
        <div className="mt-4 flex gap-2 animate-slide-up">
          <button
            onClick={() => grade("again")}
            className="btn-squish flex-1 rounded-lg border border-red-200 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-500/20"
          >
            Again
            <span className="ml-1.5 text-xs font-normal text-red-600/70">
              1 · {intervalLabel(card, "again")}
            </span>
          </button>
          <button
            onClick={() => grade("good")}
            className="btn-squish flex-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/20"
          >
            Good
            <span className="ml-1.5 text-xs font-normal text-primary/70">
              2 · {intervalLabel(card, "good")}
            </span>
          </button>
          <button
            onClick={() => grade("easy")}
            className="btn-squish flex-1 rounded-lg border border-green-200 bg-green-500/10 px-3 py-2.5 text-sm font-medium text-green-700 hover:bg-green-500/20"
          >
            Easy
            <span className="ml-1.5 text-xs font-normal text-green-600/70">
              3 · {intervalLabel(card, "easy")}
            </span>
          </button>
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          tap the card or press space to reveal
        </p>
      )}
    </div>
  );
}
