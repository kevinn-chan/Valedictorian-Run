import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Uploader } from "./uploader";
import { CompileButton } from "./compile-button";
import { CardsButton } from "./cards-button";

const CHIP: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  processing: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  done: "bg-green-500/15 text-green-700 dark:text-green-300",
  error: "bg-red-500/15 text-red-700 dark:text-red-300",
};

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title")
    .eq("id", id)
    .single();
  if (!session) notFound();

  const { data: files } = await supabase
    .from("files")
    .select("id, name, bytes, pages, ingest_status, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: false });

  const [{ count: cardCount }, { count: dueCount }] = await Promise.all([
    supabase
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("session_id", id),
    supabase
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("session_id", id)
      .lte("due_at", new Date().toISOString()),
  ]);

  const [{ data: topicPages }, { data: topicCards }] = await Promise.all([
    supabase
      .from("wiki_pages")
      .select("slug, title")
      .eq("session_id", id)
      .eq("kind", "topic")
      .order("title"),
    supabase
      .from("cards")
      .select("topic_slug, reps, lapses")
      .eq("session_id", id),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="flex items-baseline justify-between">
        <div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← All sessions
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {session.title}
          </h1>
        </div>
        {files?.some((f) => f.ingest_status === "done") && (
          <nav className="flex gap-4 text-sm font-medium">
            <Link
              href={`/sessions/${session.id}/wiki`}
              className="hover:underline"
            >
              Corpus wiki
            </Link>
            <Link
              href={`/sessions/${session.id}/plan`}
              className="hover:underline"
            >
              Learning plan
            </Link>
            {(cardCount ?? 0) > 0 && (
              <Link
                href={`/sessions/${session.id}/review`}
                className="hover:underline"
              >
                Review{dueCount ? ` (${dueCount} due)` : ""}
              </Link>
            )}
            <Link
              href={`/sessions/${session.id}/chat`}
              className="hover:underline"
            >
              Ask
            </Link>
            <Link
              href={`/sessions/${session.id}/quiz`}
              className="hover:underline"
            >
              Mock exam
            </Link>
          </nav>
        )}
      </header>

      <section className="mt-8">
        <Uploader sessionId={session.id} />
      </section>

      {files?.some((f) => f.ingest_status === "done") && (
        <p className="mt-4">
          <CardsButton sessionId={session.id} hasCards={(cardCount ?? 0) > 0} />
        </p>
      )}

      {topicPages && topicCards && topicCards.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">
            Mastery by topic
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {topicPages.map((t) => {
              const cs = topicCards.filter((c) => c.topic_slug === t.slug);
              if (!cs.length) return null;
              const reviewed = cs.some((c) => c.reps > 0 || c.lapses > 0);
              const score = cs.filter((c) => c.reps >= 2).length / cs.length;
              const cls = !reviewed
                ? "bg-secondary text-muted-foreground"
                : score < 0.4
                  ? "bg-red-500/15 text-red-700 dark:text-red-300"
                  : score < 0.8
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "bg-green-500/15 text-green-700 dark:text-green-300";
              return (
                <Link
                  key={t.slug}
                  href={`/sessions/${session.id}/wiki/${t.slug}`}
                  className={`rounded-full px-3 py-1 text-xs font-medium hover:opacity-80 ${cls}`}
                >
                  {t.title}
                  {reviewed ? ` · ${Math.round(score * 100)}%` : " · unreviewed"}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-8">
        {files?.length ? (
          <ul className="divide-y divide-border">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(f.bytes)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    CHIP[f.ingest_status] ?? CHIP.pending
                  }`}
                >
                  {f.ingest_status}
                </span>
                {(f.ingest_status === "pending" ||
                  f.ingest_status === "error") && (
                  <CompileButton fileId={f.id} />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No files yet. This session compiles into summaries, a plan, cue
            cards, and cited answers once you add materials.
          </p>
        )}
      </section>
    </main>
  );
}
