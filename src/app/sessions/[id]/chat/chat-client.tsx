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
          className="mx-0.5 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground hover:bg-secondary"
        >
          {name} p.{page}
        </a>
      ) : (
        <span key={key++} className="text-xs text-muted-foreground">
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
          <p className="text-sm text-muted-foreground">
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
                ? "ml-8 rounded-lg bg-accent p-3 text-sm"
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
          <p className="text-xs text-muted-foreground">Reading your materials…</p>
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
          className="flex-1 rounded-md border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
