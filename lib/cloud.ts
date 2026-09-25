import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FinanceData } from "./types";
import { validateData } from "./finance-repository";
let client: SupabaseClient | null = null;
export function cloudClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  if (!client)
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  return client;
}
export async function fetchCloud() {
  const c = cloudClient();
  if (!c) throw new Error("Cloud sync has not been configured.");
  const {
    data: { user },
    error: authError,
  } = await c.auth.getUser();
  if (authError || !user) throw new Error("Sign in before syncing.");
  const { data, error } = await c
    .from("finance_snapshots")
    .select("payload,revision,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.payload?.schemaVersion !== 2)
    throw new Error("The cloud copy uses an unsupported version.");
  return {
    data: validateData(data.payload.data),
    revision: Number(data.revision),
    updatedAt: String(data.updated_at),
    userId: user.id,
  };
}
export function baselineKey(userId: string) {
  return `phinance-cloud-base:${userId}`;
}
export async function uploadCloud(data: FinanceData) {
  const c = cloudClient();
  if (!c) throw new Error("Cloud sync has not been configured.");
  const {
    data: { user },
    error: authError,
  } = await c.auth.getUser();
  if (authError || !user) throw new Error("Sign in before syncing.");
  const baseline = localStorage.getItem(baselineKey(user.id));
  const { data: revision, error } = await c.rpc("save_phinance_snapshot", {
    p_expected_revision: baseline === null ? null : Number(baseline),
    p_payload: { schemaVersion: 2, data: validateData(data) },
  });
  if (error) {
    if (error.code === "40001" || error.code === "23505")
      throw new Error(
        "The cloud has a newer or unlinked copy. Export this device’s records, then inspect and download the cloud copy before uploading again. Nothing was overwritten.",
      );
    throw error;
  }
  localStorage.setItem(baselineKey(user.id), String(revision));
  return revision as number;
}
