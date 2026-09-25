"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { baselineKey, cloudClient, fetchCloud, uploadCloud } from "@/lib/cloud";
import {
  exportData,
  replaceData,
  useFinanceData,
} from "@/lib/use-finance-data";
import { Field, Notice } from "./finance/UI";
export function CloudSync() {
  const { data, demo, error: storageError } = useFinanceData();
  const [client] = useState(cloudClient);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [remote, setRemote] =
    useState<Awaited<ReturnType<typeof fetchCloud>>>();
  useEffect(() => {
    if (!client) return;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setRemote(undefined);
    });
    void client.auth.getSession().then(({ data, error }) => {
      if (error) setStatus(error.message);
      else setSession(data.session);
    });
    return () => subscription.unsubscribe();
  }, [client]);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setStatus("");
    try {
      await task();
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "Cloud sync failed. Your local records are unchanged.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="app-card space-y-4 p-5">
      <h2 className="text-xl font-semibold">Optional cloud backup & sync</h2>
      {!client ? (
        <Notice>
          Cloud sync is not connected. Local recording, offline access and file
          backups work independently. The repository includes the database setup
          and environment-variable instructions needed to enable private sign-in
          and sync.
        </Notice>
      ) : demo ? (
        <Notice>Leave demo mode before connecting personal records.</Notice>
      ) : !session ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const { error } = await client.auth.signInWithOtp({
                email,
                options: {
                  emailRedirectTo: `${window.location.origin}/settings`,
                },
              });
              if (error) throw error;
              setStatus(
                "Check your email for the sign-in link. Only continue with an account you own.",
              );
            });
          }}
        >
          <Field label="Email for sign-in">
            <input
              className="app-input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <button
            className="app-button-secondary"
            type="submit"
            disabled={busy}
          >
            Send sign-in link
          </button>
        </form>
      ) : (
        <>
          <p className="text-sm">
            Signed in as <strong>{session.user.email}</strong>. Sync is manual:
            upload after changes and download on another device before editing.
          </p>
          <Notice>
            Your financial records remain on this device after sign-out. Only
            upload records belonging to this account. Downloads replace this
            device’s records after confirmation; export a backup first.
          </Notice>
          <div className="flex flex-wrap gap-2">
            <button
              className="app-button-secondary"
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await fetchCloud();
                  setRemote(result);
                  setStatus(
                    result
                      ? "Cloud copy loaded for inspection. Local records are unchanged."
                      : "No cloud copy exists yet. You can upload this device’s records.",
                  );
                })
              }
            >
              Inspect cloud copy
            </button>
            <button
              className="app-button-secondary"
              type="button"
              disabled={busy || !!storageError}
              onClick={() => {
                if (
                  confirm(
                    `Upload this device’s financial records to ${session.user.email}?`,
                  )
                )
                  void run(async () => {
                    const revision = await uploadCloud(data);
                    setStatus(`Uploaded revision ${revision}.`);
                    setRemote(undefined);
                  });
              }}
            >
              Upload this device
            </button>
            <button
              className="app-button-secondary"
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const { error } = await client.auth.signOut();
                  if (error) throw error;
                  setStatus(
                    "Signed out. This device still holds your local records.",
                  );
                })
              }
            >
              Sign out
            </button>
          </div>
          {remote ? (
            <div className="space-y-3 border-t border-[var(--border)] pt-3">
              <p>
                Cloud revision {remote.revision} ·{" "}
                {new Date(remote.updatedAt).toLocaleString()} ·{" "}
                {remote.data.transactions.length} transactions ·{" "}
                {remote.data.accounts.length} accounts
              </p>
              <button
                className="app-button-secondary"
                type="button"
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      "Download this cloud copy and replace records on this device? A backup of your current records will be downloaded first.",
                    )
                  )
                    void run(async () => {
                      exportData();
                      if (!(await replaceData(remote.data)))
                        throw new Error(
                          "Could not save the cloud copy locally. Your sync baseline has not changed.",
                        );
                      localStorage.setItem(
                        baselineKey(remote.userId),
                        String(remote.revision),
                      );
                      setStatus(
                        "Cloud copy saved on this device. You can now edit and upload changes.",
                      );
                      setRemote(undefined);
                    });
                }}
              >
                Back up local records & use cloud copy
              </button>
            </div>
          ) : null}
        </>
      )}
      {status ? (
        <p role="status" className="text-sm">
          {status}
        </p>
      ) : null}
      {busy ? <p role="status">Working…</p> : null}
    </section>
  );
}
