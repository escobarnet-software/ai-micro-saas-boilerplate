import { createClient } from "@/lib/supabase/server";
import type { CreditTransaction, Generation } from "@/types/supabase";

export interface DashboardStats {
  totalGenerations: number;
  generationsThisMonth: number;
  creditsSpentThisMonth: number;
}

function startOfMonth(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
}

export async function getDashboardStats(
  userId: string
): Promise<DashboardStats> {
  const supabase = createClient();
  const monthStart = startOfMonth();

  const [total, monthly, spend] = await Promise.all([
    supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "succeeded")
      .gte("created_at", monthStart),
    supabase
      .from("generations")
      .select("credits_used")
      .eq("user_id", userId)
      .gte("created_at", monthStart),
  ]);

  const creditsSpentThisMonth = (spend.data ?? []).reduce(
    (totalSpent, row) => totalSpent + (row.credits_used ?? 0),
    0
  );

  return {
    totalGenerations: total.count ?? 0,
    generationsThisMonth: monthly.count ?? 0,
    creditsSpentThisMonth,
  };
}

export async function getRecentGenerations(
  userId: string,
  limit = 6
): Promise<Generation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

export async function getRecentTransactions(
  userId: string,
  limit = 6
): Promise<CreditTransaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}
