import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRole) {
  throw new Error("Missing Supabase env vars.");
}

const adminClient = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false },
});

export async function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : "";

  if (!token) {
    return { error: "Missing token." };
  }

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data?.user) {
    return { error: "Invalid token." };
  }

  const dataClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return { user: data.user, dataClient };
}
