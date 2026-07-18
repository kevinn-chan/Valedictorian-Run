import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

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

      <section className="mt-16 rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
        <h2 className="text-lg font-medium">No study sessions yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
          A session holds the full corpus for one course — lecture PDFs, notes,
          cheatsheets. Drop them in and they compile into summaries, a plan,
          cue cards, and answers with page citations.
        </p>
        <p className="mt-6 text-xs text-zinc-400">
          Session creation arrives in Phase 2. Signed in as {email ?? "…"}.
        </p>
      </section>
    </main>
  );
}
