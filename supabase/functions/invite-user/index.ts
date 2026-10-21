import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateTemporaryCredential } from '../_shared/temp-credentials.ts';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  director: 'Directeur',
  country_manager: 'Country Manager',
  raf: 'RAF (Resp. Admin. & Financier)',
  analyst: 'Analyste',
  observer: 'Observateur',
  partner: 'Partenaire',
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Accès réservé aux administrateurs" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, full_name, role, scope_country_id } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = generateTemporaryCredential();

    const { data: createData, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name || email },
    });

    if (createErr) throw createErr;
    if (!createData.user) throw new Error("Erreur lors de la création de l'utilisateur");

    await new Promise(resolve => setTimeout(resolve, 200));

    if (role) {
      const { error: roleErr } = await admin.rpc('set_user_role', {
        target_user_id: createData.user.id,
        new_role: role,
      });
      if (roleErr) throw roleErr;
    }

    // Country scope: a specific country id, or null = global access (all countries)
    const { error: scopeErr } = await admin
      .from("user_roles")
      .update({ scope_country_id: scope_country_id ?? null })
      .eq("user_id", createData.user.id);
    if (scopeErr) throw scopeErr;

    // Send invitation email with credentials
    const roleName = ROLE_LABELS[role] || role || 'Observateur';
    try {
      await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'invitation',
          recipientEmail: email,
          idempotencyKey: `invite-${createData.user.id}-${Date.now()}`,
          templateData: {
            fullName: full_name || email,
            email,
            temporaryPassword: tempPassword,
            roleName,
          },
        },
      });
    } catch (emailErr) {
      console.error('Failed to send invitation email', emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: createData.user.id,
        email,
        temporary_password: tempPassword,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
