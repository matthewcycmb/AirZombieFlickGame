import { getSupabase } from "./client";

export interface LeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
}

// ─── localStorage fallback ───

const LOCAL_LEADERBOARD_KEY = "zombie-flick-leaderboard";

function getLocalScores(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

function saveLocalScore(name: string, score: number): void {
  if (typeof window === "undefined") return;
  try {
    const entries = getLocalScores();
    entries.push({
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      player_name: name,
      score,
      created_at: new Date().toISOString(),
    });
    entries.sort((a, b) => b.score - a.score);
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {
    // silently fail
  }
}

// ─── Public API ───

export async function submitScore(
  name: string,
  score: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    saveLocalScore(name, score);
    return { success: true };
  }

  const { error } = await supabase
    .from("leaderboard_entry")
    .insert({ player_name: name, score });

  if (error) {
    saveLocalScore(name, score);
    return { success: true };
  }

  return { success: true };
}

export async function getTopScores(
  limit = 10
): Promise<LeaderboardEntry[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return getLocalScores().slice(0, limit);
  }

  const { data, error } = await supabase
    .from("leaderboard_entry")
    .select("*")
    .order("score", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return getLocalScores().slice(0, limit);
  }
  return data as LeaderboardEntry[];
}

export function isLeaderboardAvailable(): boolean {
  return true;
}
