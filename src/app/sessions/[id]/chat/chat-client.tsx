"use client";

import { Fragment, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

interface FileRef {
  id: string;
  name: string;
}

// Renders "[filename p.N]" citations as chips that open the PDF at that page.
function withCitations(text: string, files: FileRef[]) {
  const re = /\[([^\[\]]{2,80}?)\s+p\.?\s*(\d+)(?:\s*[-–]\s*\d+)?\]/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    out.push(text.slice(last, m.index));
    const [, name, page] = m;
    const file = files.find(
      (f) =>
        f.name.toLowerCase() === name.toLowerCase() ||
        f.name.toLowerCase().startsWith(name.toLowerCase().replace(/\.pdf$/, ""))
    );
    out.push(
      file ? (
        <a
          key={key++}
          href={`/api/file/${file.id}#page=${page}`}
          target="_blank"
          rel="noreferrer"
          className="mx-0.5 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          {name} p.{page}
        </a>
      ) : (
        <span key={key++} className="text-xs text-zinc-400">
          [{name} p.{page}]
        </span>
      )
    );
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

export function ChatClient({
  sessionId,
  files,
  initialMessages,
}: {
  sessionId: string;
  files: FileRef[];
  initialMessages: UIMessage[];
}) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: `/api/chat/${sessionId}` }),
    messages: initialMessages,
  });
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="mt-8 flex flex-col gap-4">
      <div className="space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Ask anything about your materials. Every answer cites the page it
            came from — and if it isn&apos;t in your files, it says so instead
            of guessing.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-8 rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-800"
                : "mr-2 text-sm leading-relaxed"
            }
          >
            {m.parts.map((p, i) =>
              p.type === "text" ? (
                <Fragment key={i}>
                  {m.role === "assistant" ? (
                    <div className="whitespace-pre-wrap">
                      {withCitations(p.text, files)}
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{p.text}</span>
                  )}
                </Fragment>
              ) : null
            )}
          </div>
        ))}
        {busy && messages.at(-1)?.role === "user" && (
          <p className="text-xs text-zinc-400">Reading your materials…</p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || busy) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="sticky bottom-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Why does Go-back-N discard out-of-order frames?"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
