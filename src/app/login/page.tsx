import { getProfiles } from "@/lib/profiles";

// Profile picker — the whole sign-in. Clicking a profile signs you in
// server-side; no emails, no passwords. Private-by-link, by design.
export default function LoginPage() {
  const profiles = getProfiles();

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-medium text-primary">Valedictorian Run</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Who&apos;s studying?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your course materials, compiled into a study system.
        </p>

        <div className="mt-12 flex items-start justify-center gap-8">
          {profiles.map((p) => (
            <form key={p.email} action="/api/profile-login" method="post">
              <input type="hidden" name="email" value={p.email} />
              <button
                type="submit"
                className="group flex w-28 flex-col items-center gap-3"
              >
                <span className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-3xl font-semibold text-primary-foreground shadow-sm transition group-hover:scale-[1.04] group-hover:ring-4 group-hover:ring-primary/25">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-muted-foreground transition group-hover:text-foreground">
                  {p.name}
                </span>
              </button>
            </form>
          ))}
          {profiles.length === 0 && (
            <p className="text-sm text-red-600">
              No profiles configured — set the PROFILES env var.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
