"use client";
import { useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { cloudClient } from "@/lib/cloud";
import { AutoSync } from "./AutoSync";
import { Field } from "./finance/UI";

function message(error: unknown) {
  const e = error as { message?: string; status?: number; code?: string };
  if (e.status === 429 || /rate.limit/i.test(e.message ?? ""))
    return "The email limit has been reached. Stop requesting links and try later, or configure custom SMTP in Supabase. If you already have a password, use Sign in instead. Password setup and recovery emails share this limit.";
  return e.message || "Sign-in failed. Please try again.";
}

export function PasswordForm({
  client,
  onDone,
}: {
  client: SupabaseClient;
  onDone?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password !== confirm) {
          setStatus("Passwords do not match.");
          return;
        }
        setBusy(true);
        setStatus("");
        try {
          const { error } = await client.auth.updateUser({ password });
          if (error) throw error;
          setPassword("");
          setConfirm("");
          setStatus(
            "Password saved. You can now sign in without requesting an email link.",
          );
          onDone?.();
        } catch (error) {
          setStatus(message(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="New password">
        <input
          className="app-input"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Confirm new password">
        <input
          className="app-input"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <p className="text-sm">Use at least 12 characters.</p>
      <button className="app-button-primary" disabled={busy}>
        {busy ? "Saving…" : "Save password"}
      </button>
      {status && <p role="status">{status}</p>}
    </form>
  );
}

function SignIn({ client }: { client: SupabaseClient }) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "link">(
    "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((c) => Math.max(0, c - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  const sendsEmail = mode !== "signin";
  const label = {
    signin: "Sign in",
    signup: "Create account",
    reset: "Send password setup link",
    link: "Send sign-in link",
  }[mode];
  return (
    <>
      <p className="text-[var(--muted-foreground)]">
        Sign in to open your finance workspace. Use your password for everyday
        access.
      </p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setStatus("");
          try {
            const redirectTo = `${window.location.origin}/settings`;
            const result =
              mode === "signin"
                ? await client.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                  })
                : mode === "signup"
                  ? await client.auth.signUp({
                      email: email.trim(),
                      password,
                      options: { emailRedirectTo: redirectTo },
                    })
                  : mode === "reset"
                    ? await client.auth.resetPasswordForEmail(email.trim(), {
                        redirectTo,
                      })
                    : await client.auth.signInWithOtp({
                        email: email.trim(),
                        options: {
                          emailRedirectTo: redirectTo,
                          shouldCreateUser: false,
                        },
                      });
            if (result.error) throw result.error;
            setPassword("");
            if (sendsEmail) {
              setCooldown(60);
              setStatus(
                mode === "reset"
                  ? "If an account exists, a password setup link has been sent. Open the newest email once, then choose your password here."
                  : "Check your email and open the newest confirmation link once.",
              );
            }
          } catch (error) {
            if (sendsEmail) setCooldown(60);
            setStatus(message(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Email">
          <input
            className="app-input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {(mode === "signin" || mode === "signup") && (
          <Field label="Password">
            <input
              className="app-input"
              type="password"
              required
              minLength={mode === "signup" ? 12 : undefined}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        {mode === "signup" && (
          <p className="text-sm">
            Use at least 12 characters. Email confirmation may be required.
          </p>
        )}
        {mode === "reset" && (
          <p className="text-sm">
            Already used an email link but never set a password? Use your same
            email here. Email limits still apply.
          </p>
        )}
        <button
          className="app-button-primary w-full"
          disabled={busy || (sendsEmail && cooldown > 0)}
        >
          {busy
            ? "Working…"
            : sendsEmail && cooldown
              ? `Wait ${cooldown}s before requesting another email`
              : label}
        </button>
        {status && (
          <p role="status" className="text-sm">
            {status}
          </p>
        )}
      </form>
      <div className="flex flex-wrap gap-3 text-sm">
        {(
          [
            ["signin", "Sign in"],
            ["reset", "Set or reset password"],
            ["signup", "Create account"],
            ["link", "Use an email link"],
          ] as const
        )
          .filter(([m]) => m !== mode)
          .map(([m, text]) => (
            <button
              key={m}
              type="button"
              className="underline"
              disabled={busy}
              onClick={() => {
                setMode(m);
                setPassword("");
                setStatus("");
              }}
            >
              {text}
            </button>
          ))}
      </div>
    </>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    ready: boolean;
    client: SupabaseClient | null;
    session: Session | null;
    error: string;
  }>({ ready: false, client: null, session: null, error: "" });
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const callbackError = hash.has("error")
      ? "The email link could not sign you in. It may have expired or already been used. Use your password, or request a fresh link after the email limit resets."
      : "";
    const isRecovery = hash.get("type") === "recovery";
    const client = cloudClient();
    const subscription = client?.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setState((s) => ({ ...s, client, session }));
    }).data.subscription;
    void (async () => {
      try {
        const result = client ? await client.auth.getSession() : null;
        if (!active) return;
        if (isRecovery && result?.data.session) setRecovery(true);
        setState({
          ready: true,
          client,
          session: result?.data.session ?? null,
          error: callbackError || (result?.error ? message(result.error) : ""),
        });
        if (callbackError)
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
      } catch (error) {
        if (active)
          setState({
            ready: true,
            client,
            session: null,
            error: message(error),
          });
      }
    })();
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);
  if (state.ready && (!state.client || (state.session && !recovery)))
    return (
      <>
        {children}
        {state.session && (
          <AutoSync
            key={state.session.user.id}
            userId={state.session.user.id}
          />
        )}
      </>
    );
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <section className="app-card space-y-5 p-6 sm:p-8">
        <p className="text-sm font-semibold text-[var(--accent-strong)]">
          Phinance
        </p>
        <h1 className="text-3xl font-bold">
          {recovery ? "Choose your password" : "Welcome to Phinance"}
        </h1>
        {!state.ready ? (
          <p role="status">Checking your sign-in…</p>
        ) : (
          <>
            {state.error && (
              <p role="alert" className="error-banner">
                {state.error}
              </p>
            )}
            {state.client &&
              (recovery && state.session ? (
                <PasswordForm
                  client={state.client}
                  onDone={() => setRecovery(false)}
                />
              ) : (
                <SignIn client={state.client} />
              ))}
          </>
        )}
        <p className="text-xs text-[var(--muted-foreground)]">
          Existing records stay on this device and sync automatically with your
          signed-in account. Use a private browser profile for your finances.
        </p>
      </section>
    </main>
  );
}
