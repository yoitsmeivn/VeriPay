import path from "path";
import dotenv from "dotenv";
import postgres from "postgres";

const repoRoot = path.join(__dirname, "..", "..");

dotenv.config({ path: path.join(repoRoot, ".env") });
dotenv.config({ path: path.join(repoRoot, ".env.marketplace") });

let sql: ReturnType<typeof postgres> | undefined;

export function getSql() {
  if (!sql) {
    const url = process.env.SUPABASE_POOLER_URL;
    if (!url) {
      throw new Error("SUPABASE_POOLER_URL is required in .env at the repo root");
    }
    sql = postgres(url, {
      ssl: "require",
      prepare: false,
      max: 5,
    });
  }
  return sql;
}

export async function closeDatabase(): Promise<void> {
  if (sql) {
    await sql.end({ timeout: 5 });
    sql = undefined;
  }
}

export function ratingFromTimes10(value: number): number {
  return Math.round(value) / 10;
}

export function ratingToTimes10(value: number): number {
  return Math.round(value * 10);
}

export function minorToMajor(minor: number): number {
  return minor / 100;
}

export function majorToMinor(major: number): number {
  return Math.round(major * 100);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function postedAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export interface DbUserRow {
  id: string;
  slug: string;
  name: string;
  avatar_url: string;
  avatar_emoji: string | null;
  rating_times_10: number;
  rating_count: number;
  joined: string;
  response_time: string;
  response_rate: string;
  location: string;
}

export interface DbListingRow {
  id: string;
  slug: string;
  title: string;
  price_minor: number;
  category: string;
  condition: string;
  description: string;
  location: string;
  distance: string;
  image_url: string | null;
  image_emoji: string | null;
  image_color: string | null;
  seller_user_id: string;
  counterparty_user_id: string | null;
  is_owned_by_viewer: boolean;
  agent_direction: string;
  agent_limit_price_minor: number;
  agent_temperament: string;
  agent_can_schedule_pickup: boolean;
  created_at: Date;
}
