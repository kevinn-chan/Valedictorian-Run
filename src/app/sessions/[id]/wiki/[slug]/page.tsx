import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarkdownView } from "./markdown-view";

export default async function WikiPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id, slug } = await params;
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("wiki_pages")
    .select("title, kind, markdown, source_refs")
    .eq("session_id", id)
    .eq("slug", slug)
    .single();
  if (!page) notFound();

  const pages = (page.source_refs as { pages?: number[] } | null)?.pages;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link
        href={`/sessions/${id}/wiki`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Corpus wiki
      </Link>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">{page.title}</h1>
      {pages && pages.length > 0 && (
        <p className="mt-1 text-xs text-zinc-400">
          pages {pages.join(", ")}
        </p>
      )}

      <div className="mt-8">
        <MarkdownView markdown={page.markdown} />
      </div>
    </main>
  );
}
