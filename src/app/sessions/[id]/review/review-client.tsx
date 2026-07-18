"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Card {
  id: string;
  front: string;
  back: string;
  topic_slug: string | null;
  source_ref: { page?: number } | null;
}

export function ReviewClient({
  sessionId,
  cards,
}: {
  sessionId: string;
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

  if (!card) {
    return (
      <div className="mt-16 text-center">
        <h2 className="text-lg font-medium">
          {reviewed ? `Done — ${reviewed} cards reviewed.` : "Nothing due."}
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Come back when the next cards fall due.
        </p>
        <Link
          href={`/sessions/${sessionId}`}
          className="mt-6 inline-block text-sm font-medium hover:underline"
        >
          ← Back to session
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <p className="text-xs text-zinc-400">
        {queue.length} to go · space = flip · 1 again · 2 good · 3 easy
      </p>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="mt-4 w-full rounded-lg border border-zinc-300 p-10 text-left dark:border-zinc-700"
      >
        <p className="text-base leading-relaxed">{card.front}</p>
        {flipped && (
          <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {card.back}
            </p>
            {card.source_ref?.page && (
              <p className="mt-3 text-xs text-zinc-400">
                p. {card.source_ref.page}
              </p>
            )}
          </div>
        )}
      </button>

      {flipped ? (
        <div className="mt-4 flex gap-2">
          {(
            [
              ["again", "Again (1)"],
              ["good", "Good (2)"],
              ["easy", "Easy (3)"],
            ] as const
          ).map(([g, label]) => (
            <button
              key={g}
              onClick={() => grade(g)}
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-zinc-400">
          tap the card or press space to reveal
        </p>
      )}
    </div>
  );
}
