"use client";

import { useState } from "react";

interface Q {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  page: number;
}

export function QuizClient({ sessionId }: { sessionId: string }) {
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    setSubmitted(false);
    setPicked({});
    const res = await fetch(`/api/quiz/${sessionId}`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error ?? "quiz generation failed");
      return;
    }
    const j = await res.json();
    setQuestions(j.questions);
  }

  if (!questions) {
    return (
      <div className="mt-10">
        <p className="text-sm text-zinc-500">
          A fresh 10-question mock exam, generated from your materials every
          time — recall, mechanisms, and calculations, each answer cited.
        </p>
        <button
          onClick={start}
          disabled={busy}
          className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "Writing your exam…" : "Start mock exam"}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  const score = questions.filter((q, i) => picked[i] === q.answer).length;
  const allAnswered = Object.keys(picked).length === questions.length;

  return (
    <div className="mt-8 space-y-8">
      {submitted && (
        <div className="rounded-lg border border-zinc-300 p-4 text-sm dark:border-zinc-700">
          <span className="font-semibold">
            {score}/{questions.length}
          </span>{" "}
          — {score >= 8 ? "exam-ready on this material." : score >= 5 ? "solid — review the misses below." : "worth another pass through the wiki before exam day."}
          <button
            onClick={start}
            disabled={busy}
            className="ml-3 text-xs underline"
          >
            {busy ? "generating…" : "new exam"}
          </button>
        </div>
      )}

      {questions.map((q, i) => (
        <div key={i}>
          <p className="text-sm font-medium">
            {i + 1}. {q.question}
          </p>
          <div className="mt-2 space-y-1">
            {q.options.map((opt, j) => {
              const chosen = picked[i] === j;
              const correct = submitted && j === q.answer;
              const wrong = submitted && chosen && j !== q.answer;
              return (
                <button
                  key={j}
                  disabled={submitted}
                  onClick={() => setPicked((p) => ({ ...p, [i]: j }))}
                  className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
                    correct
                      ? "border-green-600 bg-green-500/10"
                      : wrong
                        ? "border-red-600 bg-red-500/10"
                        : chosen
                          ? "border-zinc-900 dark:border-zinc-100"
                          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {submitted && (
            <p className="mt-2 text-xs text-zinc-500">
              {q.explanation}{" "}
              <span className="text-zinc-400">(p. {q.page})</span>
            </p>
          )}
        </div>
      ))}

      {!submitted && (
        <button
          onClick={() => setSubmitted(true)}
          disabled={!allAnswered}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {allAnswered
            ? "Submit"
            : `Answer all questions (${Object.keys(picked).length}/${questions.length})`}
        </button>
      )}
    </div>
  );
}
