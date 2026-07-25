import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OccludeClient } from "./occlude-client";

export default async function OccludePage({
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

  const { data: figures } = await supabase
    .from("figures")
    .select("id, caption, page")
    .eq("session_id", id)
    .order("page");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link
        href={`/sessions/${id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {session.title}
      </Link>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">
        Image occlusion
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cover a label on a figure and recall it from memory. Each box you draw
        becomes a spaced-repetition card in this session&apos;s review queue.
      </p>

      {figures?.length ? (
        <OccludeClient sessionId={id} figures={figures} />
      ) : (
        <p className="mt-10 rounded-xl border border-dashed px-8 py-16 text-center text-sm text-muted-foreground">
          This session has no figures yet. Compile a file that contains diagrams
          or labelled illustrations first.
        </p>
      )}
    </main>
  );
}
