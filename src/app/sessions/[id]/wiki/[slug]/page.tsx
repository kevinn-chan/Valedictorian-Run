import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/server";

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

      <article className="prose prose-zinc mt-8 max-w-none text-sm leading-relaxed dark:prose-invert [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_li]:my-1">
        <ReactMarkdown>{page.markdown}</ReactMarkdown>
      </article>
    </main>
  );
}
