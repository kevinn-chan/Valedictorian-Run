"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CompileButton({ fileId }: { fileId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    router.refresh(); // show "processing" chip
    await fetch(`/api/ingest/${fileId}`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={run}
      disabled={busy}
      className="text-xs text-zinc-500 underline hover:text-zinc-900 disabled:opacity-50 dark:hover:text-zinc-100"
    >
      {busy ? "Compiling…" : "Compile"}
    </button>
  );
}
