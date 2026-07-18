import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function WikiIndex({
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

  const { data: pages } = await supabase
    .from("wiki_pages")
    .select("slug, kind, title")
    .eq("session_id", id)
    .order("title");

  const digests = pages?.filter((p) => p.kind === "file_digest") ?? [];
  const topics = pages?.filter((p) => p.kind === "topic") ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link
        href={`/sessions/${id}`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← {session.title}
      </Link>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">Corpus wiki</h1>

      {topics.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-zinc-500">Topics</h2>
          <ul className="mt-2 space-y-1">
            {topics.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/sessions/${id}/wiki/${p.slug}`}
                  className="text-sm hover:underline"
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {digests.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-zinc-500">File digests</h2>
          <ul className="mt-2 space-y-1">
            {digests.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/sessions/${id}/wiki/${p.slug}`}
                  className="text-sm hover:underline"
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!pages?.length && (
        <p className="mt-8 text-sm text-zinc-500">
          Nothing compiled yet — upload files in the session and they&apos;ll
          appear here as topics and digests.
        </p>
      )}
    </main>
  );
}
