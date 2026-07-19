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
      className="text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
    >
      {busy ? "Compiling…" : "Compile"}
    </button>
  );
}
