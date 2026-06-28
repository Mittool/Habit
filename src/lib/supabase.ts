import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://cipdfxidweveqeaaqnke.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpcGRmeGlkd2V2ZXFlYWFxbmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTk0OTAsImV4cCI6MjA5NzA5NTQ5MH0.qYyVvKpIaZpT9pH7jeTdsMCaaBz81JCyTVgbuQ0UNt8";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

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
