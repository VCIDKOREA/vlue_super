import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Body = {
  terms_version?: string;
  user_agent?: string;
  user_id?: string | null;
};

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
      }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
      return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = (await req.json()) as Body;
    const terms_version = String(body.terms_version || "").trim();
    if (!terms_version) {
      return new Response(JSON.stringify({ ok: false, error: "terms_version_required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const forwarded = req.headers.get("x-forwarded-for");
    const client_ip =
      forwarded?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      null;

    const user_agent =
      String(body.user_agent || "").trim() || req.headers.get("user-agent") || "";

    const uid = body.user_id && isUuid(String(body.user_id)) ? String(body.user_id) : null;

    const supabase = createClient(url, serviceKey);
    const { error } = await supabase.from("terms_agreement_log").insert({
      terms_version,
      user_agent,
      client_ip,
      user_id: uid
    });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
