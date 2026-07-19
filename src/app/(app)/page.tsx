import Link from "next/link";
import { BookOpen, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSession, deleteSession } from "./actions";

export default async function Home() {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title, created_at, files(count)")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Study sessions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        One session per course — drop in materials, get a study system.
      </p>

      <form action={createSession} className="mt-8 flex gap-2">
        <input
          name="title"
          required
          placeholder="New session — e.g. CS2040 Finals"
          className="h-10 flex-1 rounded-lg border bg-card px-3.5 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/30"
        />
        <button
          type="submit"
          className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Create
        </button>
      </form>

      {sessions?.length ? (
        <ul className="mt-8 overflow-hidden rounded-xl border bg-card">
          {sessions.map((s) => {
            const fileCount =
              (s.files as unknown as { count: number }[])?.[0]?.count ?? 0;
            const created = new Date(s.created_at).toLocaleDateString(
              undefined,
              { month: "short", day: "numeric" }
            );
            return (
              <li
                key={s.id}
                className="group flex items-center gap-4 border-b px-5 py-4 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/sessions/${s.id}`}
                    className="block truncate text-sm font-medium hover:text-primary"
                  >
                    {s.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {fileCount} file{fileCount === 1 ? "" : "s"} · created{" "}
                    {created}
                  </p>
                </div>
                <form action={deleteSession}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    aria-label={`Delete ${s.title}`}
                    className="rounded-md p-2 text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="mt-10 rounded-xl border border-dashed px-8 py-16 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent">
            <BookOpen className="size-5 text-primary" />
          </span>
          <h2 className="mt-4 text-base font-medium">No study sessions yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            A session holds the full corpus for one course — lecture PDFs,
            notes, cheatsheets. Create one above and drop your files in.
          </p>
        </section>
      )}
    </main>
  );
}
