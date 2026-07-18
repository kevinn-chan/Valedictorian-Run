import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createSession, deleteSession } from "./actions";

export default async function Home() {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title, created_at, files(count)")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          Valedictorian Run
        </h1>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Sign out
          </button>
        </form>
      </header>

      <form action={createSession} className="mt-10 flex gap-2">
        <input
          name="title"
          required
          placeholder="New session — e.g. CS2040 Finals"
          className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Create
        </button>
      </form>

      {sessions?.length ? (
        <ul className="mt-8 divide-y divide-zinc-200 dark:divide-zinc-800">
          {sessions.map((s) => {
            const fileCount = (s.files as unknown as { count: number }[])?.[0]
              ?.count;
            return (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <Link
                  href={`/sessions/${s.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                >
                  {s.title}
                </Link>
                <span className="text-xs text-zinc-400">
                  {fileCount ?? 0} file{fileCount === 1 ? "" : "s"}
                </span>
                <form action={deleteSession}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    aria-label={`Delete ${s.title}`}
                    className="text-xs text-zinc-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="mt-12 rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <h2 className="text-lg font-medium">No study sessions yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            A session holds the full corpus for one course — lecture PDFs,
            notes, cheatsheets. Create one above and drop your files in.
          </p>
        </section>
      )}
    </main>
  );
}
