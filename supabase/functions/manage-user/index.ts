import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateTemporaryCredential } from '../_shared/temp-credentials.ts';

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

    const { action, user_id, email } = await req.json();

    // ── LIST STATUS ──
    if (action === "list_status") {
      const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      const statuses = (users ?? []).map((u: {
        id: string
        email?: string
        email_confirmed_at?: string | null
        last_sign_in_at?: string | null
        banned_until?: string | null
        created_at?: string
      }) => ({
        user_id: u.id,
        email: u.email,
        email_confirmed: !!u.email_confirmed_at,
        last_sign_in: u.last_sign_in_at,
        banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
        created_at: u.created_at,
      }));
      return new Response(JSON.stringify({ statuses }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── RESEND INVITE ──
    if (action === "resend_invite") {
      if (!user_id) throw new Error("user_id requis");

      const { data: { user: targetUser }, error: getUserErr } = await admin.auth.admin.getUserById(user_id);
      if (getUserErr) throw getUserErr;
      if (!targetUser) throw new Error("Utilisateur introuvable");

      if (targetUser.last_sign_in_at) {
        return new Response(
          JSON.stringify({ error: "Cet utilisateur s'est déjà connecté, l'invitation ne peut pas être relancée" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tempPassword = generateTemporaryCredential();
      const { error: updateErr } = await admin.auth.admin.updateUserById(user_id, { password: tempPassword });
      if (updateErr) throw updateErr;

      const fullName = targetUser.user_metadata?.full_name || targetUser.email;
      try {
        await admin.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'invitation-resend',
            recipientEmail: targetUser.email,
            idempotencyKey: `invite-resend-${user_id}-${Date.now()}`,
            templateData: { fullName, email: targetUser.email, temporaryPassword: tempPassword },
          },
        });
      } catch (emailErr) {
        console.error('Failed to send invitation resend email', emailErr);
      }

      return new Response(
        JSON.stringify({ success: true, email: targetUser.email, temporary_password: tempPassword }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── BLOCK ──
    if (action === "block") {
      if (!user_id) throw new Error("user_id requis");
      const { error } = await admin.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── UNBLOCK ──
    if (action === "unblock") {
      if (!user_id) throw new Error("user_id requis");
      const { error } = await admin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DELETE USER ──
    if (action === "delete") {
      if (!user_id) throw new Error("user_id requis");

      // Prevent self-deletion
      if (user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete from user_roles
      await admin.from("user_roles").delete().eq("user_id", user_id);
      // Delete from profiles
      await admin.from("profiles").delete().eq("user_id", user_id);
      // Delete auth user
      const { error: delErr } = await admin.auth.admin.deleteUser(user_id);
      if (delErr) throw delErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Une erreur est survenue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
