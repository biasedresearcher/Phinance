"use client";
import { useEffect, useState } from "react";
export function PwaStatus() {
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    let mounted = true;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          if (!mounted) return;
          setWaiting(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (
                mounted &&
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              )
                setWaiting(reg.waiting);
            });
          });
          void navigator.serviceWorker.ready.then(() => {
            if (mounted) setReady(true);
          });
        })
        .catch(() => {
          if (mounted)
            setError(
              "Offline setup could not finish. Reconnect and reload to try again.",
            );
        });
    }
    return () => {
      mounted = false;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 text-xs"
      role="status"
    >
      <span>
        {online
          ? ready
            ? "Offline access ready on this device"
            : "Online"
          : "Offline · entries save on this device; cloud sync needs a connection"}
      </span>
      {error ? <span>{error}</span> : null}
      {waiting ? (
        <button
          type="button"
          className="app-button-secondary"
          onClick={() => {
            if (
              confirm(
                "Load the new app version? Save any unfinished form first.",
              )
            ) {
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => window.location.reload(),
                { once: true },
              );
              waiting.postMessage({ type: "ACTIVATE_UPDATE" });
            }
          }}
        >
          Update available · reload
        </button>
      ) : null}
    </div>
  );
}
