"use client";
import { useEffect, useRef, useState } from "react";
import { baselineKey } from "@/lib/cloud";
import {
  OWNER_KEY,
  syncKey,
  parseCopy,
  decideSync,
  sameData,
  type CloudCopy,
} from "@/lib/sync-state";
import { syncTransport } from "@/lib/sync-transport";
import {
  getFinanceSnapshot,
  useFinanceData,
  updateData,
  downloadText,
} from "@/lib/use-finance-data";

type Status = { text: string; issue?: boolean; conflict?: boolean };
export function AutoSync({ userId }: { userId: string }) {
  const snapshot = useFinanceData();
  const [status, setStatus] = useState<Status>({ text: "Checking cloud…" });
  const [open, setOpen] = useState(false);
  const wake = useRef<(choice?: "local" | "cloud") => void>(() => {});
  const conflict = useRef<{
    remote: CloudCopy | null;
    raw: string | null;
  } | null>(null);
  useEffect(() => {
    let alive = true;
    let running = false;
    let rerun = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const report = (s: Status) => {
      if (alive) setStatus(s);
    };
    const saveBase = (copy: CloudCopy) => {
      localStorage.setItem(syncKey(userId), JSON.stringify(copy));
      localStorage.setItem(baselineKey(userId), String(copy.revision));
      localStorage.setItem(OWNER_KEY, userId);
    };
    const pass = async (choice?: "local" | "cloud") => {
      if (running) {
        rerun = true;
        return;
      }
      running = true;
      const execute = async () => {
        if (!alive) return;
        const initial = getFinanceSnapshot();
        if (!initial.ready) return;
        if (initial.demo) {
          report({ text: "Demo · sync paused" });
          return;
        }
        if (initial.error || initial.recoveryRaw !== null) {
          report({
            text: "Sync paused · check saved records in Settings",
            issue: true,
          });
          return;
        }
        if (!navigator.onLine) {
          report({ text: "Offline · edits saved here, sync resumes online" });
          return;
        }
        const owner = localStorage.getItem(OWNER_KEY);
        const otherHistory = Object.keys(localStorage).some(
          (k) =>
            k.startsWith("phinance-cloud-base:") && k !== baselineKey(userId),
        );
        if (
          (owner && owner !== userId) ||
          (!owner &&
            otherHistory &&
            localStorage.getItem(baselineKey(userId)) === null)
        ) {
          report({
            text: "Sync paused: these local records belong to another account. Use that account or a separate browser profile.",
            issue: true,
          });
          return;
        }
        const base = parseCopy(localStorage.getItem(syncKey(userId)));
        const legacyRaw = localStorage.getItem(baselineKey(userId));
        const legacy = legacyRaw === null ? null : Number(legacyRaw);
        if (legacy !== null && (!Number.isSafeInteger(legacy) || legacy < 1))
          throw new Error(
            "Invalid sync history. Export your records before recovery.",
          );
        controller = new AbortController();
        const timeout = setTimeout(() => controller?.abort(), 15000);
        try {
          report({ text: "Syncing…" });
          const api = await syncTransport(userId, controller.signal);
          const remote = await api.read();
          if (!alive) return;
          const current = getFinanceSnapshot();
          if (current.demo || current.error || !current.ready) return;
          // Read current edits after the network request; recheck again inside
          // the local write lock before applying a cloud copy.
          let decision = decideSync(current.data, remote, base, legacy);
          if (choice) {
            const shown = conflict.current;
            if (
              !shown ||
              shown.raw !== current.raw ||
              JSON.stringify(shown.remote) !== JSON.stringify(remote)
            ) {
              choice = undefined;
            } else {
              localStorage.setItem(
                `phinance-sync-recovery:${userId}`,
                JSON.stringify({
                  savedAt: new Date().toISOString(),
                  local: {
                    app: "Phinance",
                    schemaVersion: 2,
                    data: current.data,
                  },
                  cloud: remote
                    ? { app: "Phinance", schemaVersion: 2, data: remote.data }
                    : null,
                }),
              );
              downloadText(
                `phinance-before-sync-${Date.now()}.json`,
                JSON.stringify({
                  app: "Phinance",
                  schemaVersion: 2,
                  data: current.data,
                }),
              );
              if (remote)
                downloadText(
                  `phinance-cloud-before-sync-${Date.now()}.json`,
                  JSON.stringify({
                    app: "Phinance",
                    schemaVersion: 2,
                    data: remote.data,
                  }),
                );
              decision =
                choice === "local"
                  ? "upload"
                  : remote
                    ? "download"
                    : "conflict";
            }
          }
          if (decision === "conflict") {
            conflict.current = { remote, raw: current.raw };
            report({
              text: "Both copies need review · automatic sync paused",
              conflict: true,
              issue: true,
            });
            return;
          }
          // Claim the browser profile before its first automatic upload.
          localStorage.setItem(OWNER_KEY, userId);
          if (decision === "download" && remote) {
            const saved = await updateData(
              remote.data,
              current.raw,
              () => alive && !controller?.signal.aborted,
            );
            if (!alive) return;
            if (!saved) {
              rerun = true;
              return;
            }
            saveBase(remote);
          } else if (decision === "upload") {
            const saved = await api.write(
              current.data,
              remote?.revision ?? null,
            );
            if (!alive) return;
            saveBase(saved);
            if (!sameData(getFinanceSnapshot().data, current.data))
              rerun = true;
          } else if (remote) saveBase(remote);
          conflict.current = null;
          report({ text: rerun ? "New edits waiting to sync…" : "Up to date" });
        } finally {
          clearTimeout(timeout);
          controller = null;
        }
      };
      try {
        if (navigator.locks)
          await navigator.locks.request("phinance-sync", execute);
        else await execute();
      } catch (error) {
        report({
          text: `Saved on this device · ${error instanceof Error && error.name !== "AbortError" ? error.message : "Connection interrupted; retrying automatically."}`,
          issue: true,
        });
      } finally {
        running = false;
        if (alive && rerun) {
          rerun = false;
          schedule();
        }
      }
    };
    const schedule = (choice?: "local" | "cloud") => {
      clearTimeout(timer);
      timer = setTimeout(
        () => {
          void pass(choice);
        },
        choice ? 0 : 800,
      );
    };
    wake.current = schedule;
    const resume = () => {
      if (document.visibilityState === "visible") schedule();
    };
    window.addEventListener("online", resume);
    window.addEventListener("offline", resume);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    const interval = setInterval(resume, 10000);
    schedule();
    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(interval);
      controller?.abort();
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", resume);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
      wake.current = () => {};
    };
  }, [userId]);
  useEffect(() => {
    wake.current();
  }, [snapshot.raw, snapshot.demo, snapshot.ready, snapshot.error]);
  return (
    <aside
      aria-label="Cloud sync"
      className="fixed bottom-3 right-3 z-40 max-w-[calc(100vw-1.5rem)]"
    >
      {open && (
        <div className="app-card mb-2 w-80 max-w-full space-y-3 p-4 text-sm">
          <p role="status">{status.text}</p>
          <p>
            Changes sync automatically after edits, on reconnect, and every 10
            seconds while this page is visible. Keep the app open until it says
            Up to date.
          </p>
          {status.conflict && (
            <>
              <p>
                Both copies are preserved. Choosing one replaces the other;
                backups of both are downloaded first. Compare the backups if you
                need changes from both.
              </p>
              <button
                className="app-button-secondary w-full"
                onClick={() => {
                  if (
                    confirm(
                      "Back up both copies and replace cloud records with this device’s records?",
                    )
                  )
                    wake.current("local");
                }}
              >
                Keep this device’s copy
              </button>
              <button
                className="app-button-secondary w-full"
                onClick={() => {
                  if (
                    confirm(
                      "Back up both copies and replace this device’s records with the cloud copy?",
                    )
                  )
                    wake.current("cloud");
                }}
              >
                Use cloud copy
              </button>
            </>
          )}
          <button
            className="app-button-secondary"
            onClick={() => wake.current()}
          >
            Sync now
          </button>
          <button className="ml-3 underline" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
      <button
        className="app-button-primary max-w-full text-left shadow-lg"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {status.issue ? "Sync needs attention" : status.text}
      </button>
    </aside>
  );
}
