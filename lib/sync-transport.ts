import { cloudClient } from "./cloud";
import { validateData } from "./finance-repository";
import type { FinanceData } from "./types";
import type { CloudCopy } from "./sync-state";
// Capture one session's token for the whole pass: a later account switch must
// never send the old account's records under the new account's credentials.
export async function syncTransport(userId: string, signal: AbortSignal) {
  const client = cloudClient();
  if (!client) throw new Error("Cloud sync is not configured.");
  const { data, error } = await client.auth.getSession();
  if (error || data.session?.user.id !== userId)
    throw new Error("Sign in again to resume sync.");
  const headers = {
    apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    Authorization: `Bearer ${data.session.access_token}`,
    "Content-Type": "application/json",
  };
  const request = async (path: string, body?: unknown) => {
    const result = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`,
      {
        method: body === undefined ? "GET" : "POST",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
        cache: "no-store",
      },
    );
    const json = await result.json();
    if (!result.ok)
      throw new Error(
        json.code === "40001" || json.code === "23505"
          ? "Cloud changed during sync. Retrying safely…"
          : json.message || `Cloud sync failed (${result.status}).`,
      );
    return json;
  };
  return {
    read: async (): Promise<CloudCopy | null> => {
      const rows = await request(
        `finance_snapshots?select=payload,revision&user_id=eq.${encodeURIComponent(userId)}`,
      );
      if (!Array.isArray(rows)) throw new Error("Unexpected cloud response.");
      if (!rows.length) return null;
      const row = rows[0];
      if (
        rows.length !== 1 ||
        row.payload?.schemaVersion !== 2 ||
        !Number.isSafeInteger(row.revision) ||
        row.revision < 1
      )
        throw new Error("Unsupported cloud record. Sync paused.");
      return { revision: row.revision, data: validateData(row.payload.data) };
    },
    write: async (
      records: FinanceData,
      revision: number | null,
    ): Promise<CloudCopy> => {
      const next = await request("rpc/save_phinance_snapshot", {
        p_expected_revision: revision,
        p_payload: { schemaVersion: 2, data: validateData(records) },
      });
      if (!Number.isSafeInteger(next) || next < 1)
        throw new Error(
          "Invalid sync acknowledgement. Your local copy is safe.",
        );
      return { data: records, revision: next };
    },
  };
}
