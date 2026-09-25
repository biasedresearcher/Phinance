"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { cloudClient } from "@/lib/cloud";
import { downloadText } from "@/lib/use-finance-data";
import { PasswordForm } from "./AuthGate";
export function CloudSync() {
  const [client] = useState(cloudClient);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!client) return;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    void client.auth.getSession().then(({ data }) => setSession(data.session));
    return () => subscription.unsubscribe();
  }, [client]);
  return (
    <section className="app-card space-y-4 p-5">
      <h2 className="text-xl font-semibold">Automatic cloud sync</h2>
      {!client ? (
        <p>
          Cloud sync is not configured. Local records and file backups remain
          available.
        </p>
      ) : session ? (
        <>
          <p>
            Signed in as <strong>{session.user.email}</strong>.
          </p>
          <p>
            Your saved edits upload automatically. Other devices receive updates
            when you open the app, return to it, or within 10 seconds while it
            is visible. Use the floating sync button to see the status or retry.
          </p>
          <p>
            Offline edits stay on this device and sync when you reconnect. If
            both devices changed, sync pauses for review instead of silently
            replacing your work.
          </p>
          <p>
            Use the same account on each device. Local records remain here after
            sign-out; use a private browser profile for each account.
          </p>
          <button
            className="app-button-secondary"
            onClick={async () => {
              const { error } = await client.auth.signOut();
              if (error) setError(error.message);
            }}
          >
            Sign out
          </button>
          <button
            className="app-button-secondary"
            onClick={() => {
              const backup = localStorage.getItem(
                `phinance-sync-recovery:${session.user.id}`,
              );
              if (backup)
                downloadText("phinance-sync-conflict-backup.json", backup);
              else
                setError(
                  "There is no saved conflict backup on this device yet.",
                );
            }}
          >
            Export last sync conflict backup
          </button>
          <details className="border-t border-[var(--border)] pt-3">
            <summary className="cursor-pointer font-semibold">
              Set or change your password
            </summary>
            <div className="mt-3">
              <PasswordForm client={client} />
            </div>
          </details>
        </>
      ) : (
        <p>Sign in to enable automatic sync.</p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
