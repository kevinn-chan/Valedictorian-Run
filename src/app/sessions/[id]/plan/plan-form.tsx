"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlanForm({
  sessionId,
  initialGoal,
  initialExamDate,
  hasPlan,
}: {
  sessionId: string;
  initialGoal: string;
  initialExamDate: string;
  hasPlan: boolean;
}) {
  const router = useRouter();
  const [goal, setGoal] = useState(initialGoal);
  const [examDate, setExamDate] = useState(initialExamDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/plan/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, examDate }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error ?? "Plan generation failed");
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={generate} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Goal — e.g. confident on all ARQ protocols"
          className="min-w-64 flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700"
        />
        <input
          type="date"
          required
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy
            ? "Planning…"
            : hasPlan
              ? "Regenerate plan"
              : "Generate plan"}
        </button>
      </div>
      {busy && (
        <p className="text-xs text-zinc-500">
          Building your schedule from the corpus wiki — up to a minute.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
