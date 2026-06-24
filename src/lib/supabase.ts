import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Only create a real Supabase client if both URL and key look valid
const isSupabaseConfigured =
  supabaseUrl.length > 10 &&
  supabaseAnonKey.length > 10 &&
  supabaseUrl.startsWith("http") &&
  !supabaseUrl.includes("placeholder");

export let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch {
    supabase = null;
  }
}

export { isSupabaseConfigured };

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};
